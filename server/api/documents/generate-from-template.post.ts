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

  // Build context for template rendering
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
  const context: any = {
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
  }

  // If there's questionnaire data, add it
  if (body.questionnaireData) {
    context.questionnaireItems = body.questionnaireData
  }

  // Render template with context
  const renderedContent = renderer.render(template.content, context)

  // Create document record
  const document = {
    id: nanoid(),
    title: body.title || template.name,
    description: body.description || template.description,
    status: 'DRAFT',
    template_id: template.id,
    matter_id: body.matterId || null,
    content: renderedContent,
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
      id, title, description, status, template_id, matter_id, content, file_path,
      file_size, mime_type, variable_values, requires_notary, notarization_status,
      pandadoc_request_id, client_id, signed_at, signature_data, viewed_at, sent_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    document.id,
    document.title,
    document.description,
    document.status,
    document.template_id,
    document.matter_id,
    document.content,
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

