// Generate a personalized document from a template
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only lawyers/admins can generate documents
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()
  const renderer = useTemplateRenderer()
  
  // Get template
  const template = await db.prepare(`
    SELECT * FROM document_templates WHERE id = ?
  `).bind(body.templateId).first()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  // Parse variable mappings if they exist
  let variableMappings: Record<string, { source: string, field: string }> = {}
  if (template.variable_mappings) {
    try {
      variableMappings = JSON.parse(template.variable_mappings)
    } catch (error) {
      console.error('Error parsing variable mappings:', error)
    }
  }

  // Get client data
  const client = await db.prepare(`
    SELECT u.*, cp.*
    FROM users u
    LEFT JOIN client_profiles cp ON u.id = cp.user_id
    WHERE u.id = ?
  `).bind(body.clientId).first()

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get matter data if matterId is provided
  let matter: any = null
  if (body.matterId) {
    matter = await db.prepare(`
      SELECT * FROM matters WHERE id = ?
    `).bind(body.matterId).first()
  }

  // Build context for template rendering
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim()

  // Start with mapped variables
  const context: any = {}

  // Apply variable mappings
  Object.entries(variableMappings).forEach(([variable, mapping]) => {
    if (mapping.source === 'client') {
      // Map client fields
      const fieldMap: Record<string, any> = {
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        fullName: clientFullName,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zip_code || ''
      }
      context[variable] = fieldMap[mapping.field] || ''
    } else if (mapping.source === 'matter' && matter) {
      // Map matter fields
      const fieldMap: Record<string, any> = {
        title: matter.title || '',
        matterNumber: matter.matter_number || '',
        status: matter.status || '',
        contractDate: matter.contract_date ? new Date(matter.contract_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
        description: matter.description || ''
      }
      context[variable] = fieldMap[mapping.field] || ''
    }
  })

  // Add default context (for backward compatibility and unmapped variables)
  Object.assign(context, {
    // Client info
    clientFirstName: client.first_name || '',
    clientLastName: client.last_name || '',
    clientFullName,
    clientName: clientFullName, // Alias for templates that use clientName
    clientAddress: client.address || '',
    clientCity: client.city || '',
    clientState: client.state || '',
    clientZipCode: client.zip_code || '',
    clientEmail: client.email || '',
    clientPhone: client.phone || '',
    
    // Spouse info
    spouseName: client.spouse_name || '',
    spouseFirstName: client.spouse_name?.split(' ')[0] || '',
    spouseLastName: client.spouse_name?.split(' ').slice(1).join(' ') || '',
    
    // Service/Matter info (for engagement letters)
    serviceName: template.name || 'Legal Services',
    matterName: body.matterName || template.name || 'Legal Services',
    
    // Fee info (for engagement letters) - placeholder values
    fee: '$[To be determined]',
    retainerFee: '$[To be determined]',
    hourlyRate: '$[To be determined]',
    
    // Dates
    currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    signatureDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    signedOn: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    
    // Placeholder for signatures (will be filled when client signs)
    clientSignature: '[Signature Required]',
    signature: '[Signature Required]',

    // Merge any custom data provided
    ...body.customData
  })

  // If there's questionnaire data, add it
  if (body.questionnaireData) {
    context.questionnaireItems = body.questionnaireData
  }

  // Render HTML for preview
  const renderedContent = renderer.render(template.content, context)

  // Generate DOCX if template has a blob key
  let docxBlobKey = null
  if (template.docx_blob_key) {
    try {
      // Load template DOCX from blob storage
      const templateBlob = await hubBlob().get(template.docx_blob_key)
      if (templateBlob) {
        const templateBuffer = await templateBlob.arrayBuffer()

        // Generate filled DOCX using docxtemplater
        const { generateDocx } = await import('../../utils/docx-generator')
        const generatedDocx = generateDocx({
          templateBuffer,
          data: context
        })

        // Store generated DOCX in blob storage
        const documentId = nanoid()
        docxBlobKey = `documents/${documentId}/${body.title || template.name}.docx`
        await hubBlob().put(docxBlobKey, generatedDocx)

        // Use the generated document ID
        var finalDocumentId = documentId
      } else {
        console.warn('Template DOCX not found in blob storage, generating HTML only')
      }
    } catch (error) {
      console.error('Error generating DOCX:', error)
      // Continue with HTML only if DOCX generation fails
    }
  }

  // Create document record
  const documentId = finalDocumentId || nanoid()
  const document = {
    id: documentId,
    title: body.title || template.name,
    description: body.description || template.description,
    status: 'DRAFT',
    template_id: template.id,
    matter_id: body.matterId || null,
    content: renderedContent,
    docx_blob_key: docxBlobKey,
    file_path: null,
    file_size: null,
    mime_type: 'text/html',
    variable_values: JSON.stringify(context),
    requires_notary: template.requires_notary,
    notarization_status: template.requires_notary ? 'PENDING' : 'NOT_REQUIRED',
    pandadoc_request_id: null,
    client_id: body.clientId,
    signed_at: null,
    signature_data: null,
    viewed_at: null,
    sent_at: null,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO documents (
      id, title, description, status, template_id, matter_id, content, docx_blob_key,
      file_path, file_size, mime_type, variable_values, requires_notary, notarization_status,
      pandadoc_request_id, client_id, signed_at, signature_data, viewed_at, sent_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    document.id,
    document.title,
    document.description,
    document.status,
    document.template_id,
    document.matter_id,
    document.content,
    document.docx_blob_key,
    document.file_path,
    document.file_size,
    document.mime_type,
    document.variable_values,
    document.requires_notary,
    document.notarization_status,
    document.pandadoc_request_id,
    document.client_id,
    document.signed_at,
    document.signature_data,
    document.viewed_at,
    document.sent_at,
    document.created_at,
    document.updated_at
  ).run()

  return { document }
})

