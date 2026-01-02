// Generate all documents for a specific journey step
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
  
  const { clientJourneyId, stepId, customData = {}, questionnaireData = {} } = body

  if (!clientJourneyId || !stepId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID and step ID are required'
    })
  }

  // Get client journey and client data
  const clientJourney = await db.prepare(`
    SELECT cj.*, u.*, cp.*
    FROM client_journeys cj
    JOIN users u ON cj.client_id = u.id
    LEFT JOIN client_profiles cp ON u.id = cp.user_id
    WHERE cj.id = ?
  `).bind(clientJourneyId).first()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Get step info to find related templates
  const step = await db.prepare(`
    SELECT * FROM journey_steps WHERE id = ?
  `).bind(stepId).first()

  if (!step) {
    throw createError({
      statusCode: 404,
      message: 'Journey step not found'
    })
  }

  // Find templates that match this step's group
  // We'll look for templates whose description matches the step
  const templates = await db.prepare(`
    SELECT * FROM document_templates
    WHERE is_active = 1
    AND description LIKE ?
    ORDER BY original_file_name ASC
  `).bind(`%${step.name}%`).all()

  if (!templates.results || templates.results.length === 0) {
    // If no exact match, get all templates in the relevant category
    // This is a fallback
    return {
      documents: [],
      message: 'No templates found for this step. You may need to manually select templates.'
    }
  }

  // Build context for rendering
  const context: any = {
    // Client info
    clientFirstName: clientJourney.first_name || '',
    clientLastName: clientJourney.last_name || '',
    clientFullName: `${clientJourney.first_name || ''} ${clientJourney.last_name || ''}`.trim(),
    clientAddress: clientJourney.address || '',
    clientCity: clientJourney.city || '',
    clientState: clientJourney.state || '',
    clientZipCode: clientJourney.zip_code || '',
    clientEmail: clientJourney.email || '',
    clientPhone: clientJourney.phone || '',
    
    // Spouse info
    spouseName: clientJourney.spouse_name || '',
    spouseFirstName: clientJourney.spouse_name?.split(' ')[0] || '',
    spouseLastName: clientJourney.spouse_name?.split(' ').slice(1).join(' ') || '',
    
    // Dates
    currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    signatureDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    signedOn: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    
    // Placeholders
    clientSignature: '[Signature Required]',
    signature: '[Signature Required]',
    
    // Custom data
    ...customData,
    
    // Questionnaire data
    questionnaireItems: questionnaireData
  }

  // Set default aliases
  context.alternateCompanyName = context.trustName || context.alternateCompanyName || '[Trust Name]'
  context.companyName = context.trustName || context.companyName || '[Trust Name]'

  // Generate documents
  const generatedDocs = []
  
  for (const template of templates.results) {
    try {
      // Render template with context
      const renderedContent = renderer.render(template.content, context)

      // Create document record
      const docId = nanoid()
      await db.prepare(`
        INSERT INTO documents (
          id, title, description, status, template_id, content, variable_values,
          requires_notary, notarization_status, client_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        docId,
        template.name,
        template.description,
        'DRAFT',
        template.id,
        renderedContent,
        JSON.stringify(context),
        template.requires_notary,
        template.requires_notary ? 'PENDING' : 'NOT_REQUIRED',
        clientJourney.client_id,
        Date.now(),
        Date.now()
      ).run()

      generatedDocs.push({
        id: docId,
        title: template.name,
        requiresNotary: Boolean(template.requires_notary)
      })
    } catch (error) {
      console.error(`Error generating document from template ${template.id}:`, error)
    }
  }

  return {
    success: true,
    documents: generatedDocs,
    count: generatedDocs.length
  }
})



