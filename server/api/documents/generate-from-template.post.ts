// Generate a personalized document from a template
import { nanoid } from 'nanoid'
import { blob } from 'hub:blob'
import { logActivity } from '../../utils/activity-logger'

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
  const { eq, and, or } = await import('drizzle-orm')
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
    }
    catch (error) {
      console.error('Error parsing variable mappings:', error)
    }
  }

  // Resolve client identity via the Belly Button (people) table
  const { resolveClientIds } = await import('../../utils/client-ids')
  const resolved = await resolveClientIds(body.clientId)

  if (!resolved || !resolved.clientTableId) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const clientTableId = resolved.clientTableId

  // Get client identity (people + client-specific fields)
  const person = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, resolved.personId))
    .get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Client person record not found'
    })
  }

  const clientRow = await db.select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientTableId))
    .get()

  const client = {
    id: clientTableId,
    email: person.email,
    first_name: person.firstName,
    last_name: person.lastName,
    phone: person.phone,
    date_of_birth: person.dateOfBirth,
    address: person.address,
    city: person.city,
    state: person.state,
    zip_code: person.zipCode,
    has_minor_children: clientRow?.hasMinorChildren ?? false,
    children_info: clientRow?.childrenInfo ?? null,
    business_name: clientRow?.businessName ?? null,
    business_type: clientRow?.businessType ?? null
  }

  // Get spouse information from unified relationships table
  let spouse: any = null
  if (resolved?.personId) {
    const spouseRel = await db.select()
      .from(schema.relationships)
      .where(and(
        or(
          eq(schema.relationships.fromPersonId, resolved.personId),
          eq(schema.relationships.toPersonId, resolved.personId)
        ),
        eq(schema.relationships.relationshipType, 'SPOUSE')
      ))
      .orderBy(schema.relationships.ordinal)
      .limit(1)
      .get()

    if (spouseRel) {
      const spousePersonId = spouseRel.fromPersonId === resolved.personId
        ? spouseRel.toPersonId
        : spouseRel.fromPersonId
      const spousePerson = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, spousePersonId))
        .get()
      if (spousePerson) {
        spouse = {
          id: spousePerson.id,
          first_name: spousePerson.firstName,
          last_name: spousePerson.lastName,
          email: spousePerson.email,
          phone: spousePerson.phone
        }
      }
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

  // Resolve mapped variables via centralized
  // resolver (uses people table, not deprecated
  // clientProfiles)
  const resolvedMappings
    = Object.keys(variableMappings).length > 0
      ? await resolveVariableMappings(
        variableMappings,
        {
          clientId: clientTableId,
          matterId: body.matterId || null,
        },
      )
      : {}

  const context: any = { ...resolvedMappings }

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
  // Use precompiled template if available (Workers-safe), otherwise fall back to runtime compilation
  const renderedContent = renderer.render(template.content, context, template.compiledTemplate || undefined)

  // Generate DOCX if template has a blob key
  let docxBlobKey = null
  let unsignedPdfBlobKey = null
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

        // Convert DOCX to PDF for pre-signing preview
        try {
          const pdfBytes = await convertDocxToPdf(
            generatedDocx,
          )
          unsignedPdfBlobKey
            = `documents/${documentId}/unsigned.pdf`
          await blob.put(
            unsignedPdfBlobKey,
            pdfBytes,
          )
        }
        catch (pdfError) {
          console.error(
            'DOCX-to-PDF conversion failed,',
            'continuing without unsigned PDF:',
            pdfError,
          )
        }
      }
      else {
        console.warn('Template DOCX not found in blob storage, generating HTML only')
      }
    }
    catch (error) {
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
    unsignedPdfBlobKey: unsignedPdfBlobKey,
    filePath: null,
    fileSize: null,
    mimeType: 'text/html',
    variableValues: JSON.stringify(context),
    requiresNotary: template.requiresNotary,
    clientId: clientTableId,
    signedAt: null,
    signatureData: null,
    viewedAt: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now
  })

  // Log document creation activity
  const documentTitle = body.title || template.name
  await logActivity({
    type: 'DOCUMENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'document', id: documentId, name: documentTitle },
    relatedEntities: [
      { type: 'client', id: clientTableId, name: clientFullName },
      { type: 'template', id: template.id, name: template.name }
    ],
    matterId: body.matterId || undefined,
    event
  })

  // Queue for Google Drive sync if enabled and matter is associated
  if (body.matterId && docxBlobKey) {
    try {
      const { isDriveEnabled } = await import('../../utils/google-drive')
      if (await isDriveEnabled()) {
        // Mark document as pending sync
        await db.update(schema.documents)
          .set({ googleDriveSyncStatus: 'PENDING' })
          .where(eq(schema.documents.id, documentId))

        // Queue the sync (in a real implementation, this would use the queue binding)
        // For now, we'll do synchronous sync - the queue will be used for retries
        const { syncDocumentToDrive } = await import('../../utils/google-drive')
        syncDocumentToDrive(documentId).catch((error) => {
          console.error('Failed to sync document to Google Drive:', error)
        })
      }
    }
    catch (error) {
      console.error('Error checking Drive sync status:', error)
    }
  }

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
      unsigned_pdf_blob_key: unsignedPdfBlobKey,
      file_path: null,
      file_size: null,
      mime_type: 'text/html',
      variable_values: JSON.stringify(context),
      requires_notary: template.requiresNotary,
      client_id: clientTableId,
      signed_at: null,
      signature_data: null,
      viewed_at: null,
      sent_at: null,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})
