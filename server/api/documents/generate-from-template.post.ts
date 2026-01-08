// Generate a personalized document from a template
import { nanoid } from 'nanoid'
import { blob } from 'hub:blob'

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
  const { useDrizzle, schema } = await import('../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()
  const renderer = useTemplateRenderer()

  // Get template
  const template = await db.select()
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, body.templateId))
    .get()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  // Parse variable mappings if they exist
  let variableMappings: Record<string, { source: string, field: string }> = {}
  if (template.variableMappings) {
    try {
      variableMappings = JSON.parse(template.variableMappings)
    } catch (error) {
      console.error('Error parsing variable mappings:', error)
    }
  }

  // Get client data
  const clientData = await db.select({
    // User fields
    id: schema.users.id,
    email: schema.users.email,
    firstName: schema.users.firstName,
    lastName: schema.users.lastName,
    phone: schema.users.phone,
    // Client profile fields
    dateOfBirth: schema.clientProfiles.dateOfBirth,
    address: schema.clientProfiles.address,
    city: schema.clientProfiles.city,
    state: schema.clientProfiles.state,
    zipCode: schema.clientProfiles.zipCode,
    hasMinorChildren: schema.clientProfiles.hasMinorChildren,
    childrenInfo: schema.clientProfiles.childrenInfo,
    businessName: schema.clientProfiles.businessName,
    businessType: schema.clientProfiles.businessType
  })
    .from(schema.users)
    .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
    .where(eq(schema.users.id, body.clientId))
    .get()

  if (!clientData) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Map to snake_case for compatibility with existing code
  const client = {
    id: clientData.id,
    email: clientData.email,
    first_name: clientData.firstName,
    last_name: clientData.lastName,
    phone: clientData.phone,
    date_of_birth: clientData.dateOfBirth,
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    zip_code: clientData.zipCode,
    has_minor_children: clientData.hasMinorChildren,
    children_info: clientData.childrenInfo,
    business_name: clientData.businessName,
    business_type: clientData.businessType
  }

  // Get spouse information from relationships system
  let spouse: any = null
  const spouseData = await db.select()
    .from(schema.people)
    .innerJoin(schema.clientRelationships, eq(schema.people.id, schema.clientRelationships.personId))
    .where(and(
      eq(schema.clientRelationships.clientId, body.clientId),
      eq(schema.clientRelationships.relationshipType, 'SPOUSE')
    ))
    .orderBy(schema.clientRelationships.ordinal)
    .limit(1)
    .get()

  if (spouseData) {
    spouse = {
      id: spouseData.people.id,
      first_name: spouseData.people.firstName,
      last_name: spouseData.people.lastName,
      email: spouseData.people.email,
      phone: spouseData.people.phone
    }
  }

  // Get matter data if matterId is provided
  let matter: any = null
  if (body.matterId) {
    matter = await db.select()
      .from(schema.matters)
      .where(eq(schema.matters.id, body.matterId))
      .get()
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

    // Spouse info (from people/relationships system)
    spouseName: spouse ? `${spouse.first_name || ''} ${spouse.last_name || ''}`.trim() : '',
    spouseFirstName: spouse?.first_name || '',
    spouseLastName: spouse?.last_name || '',

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
  if (template.docxBlobKey) {
    try {
      // Load template DOCX from blob storage
      const templateBlob = await blob.get(template.docxBlobKey)
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
        await blob.put(docxBlobKey, generatedDocx)

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
  const now = new Date()

  await db.insert(schema.documents).values({
    id: documentId,
    title: body.title || template.name,
    description: body.description || template.description,
    status: 'DRAFT',
    templateId: template.id,
    matterId: body.matterId || null,
    content: renderedContent,
    docxBlobKey: docxBlobKey,
    filePath: null,
    fileSize: null,
    mimeType: 'text/html',
    variableValues: JSON.stringify(context),
    requiresNotary: template.requiresNotary,
    clientId: body.clientId,
    signedAt: null,
    signatureData: null,
    viewedAt: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now
  })

  // Return document object for compatibility
  return {
    document: {
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
      requires_notary: template.requiresNotary,
      client_id: body.clientId,
      signed_at: null,
      signature_data: null,
      viewed_at: null,
      sent_at: null,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})

