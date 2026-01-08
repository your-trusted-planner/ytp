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
  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, like } = await import('drizzle-orm')
  const db = useDrizzle()
  const renderer = useTemplateRenderer()

  const { clientJourneyId, stepId, customData = {}, questionnaireData = {} } = body

  if (!clientJourneyId || !stepId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID and step ID are required'
    })
  }

  // Get client journey
  const clientJourneyRecord = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, clientJourneyId))
    .get()

  if (!clientJourneyRecord) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Get client data
  const clientUser = await db.select()
    .from(schema.users)
    .where(eq(schema.users.id, clientJourneyRecord.clientId))
    .get()

  if (!clientUser) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get client profile if exists
  const clientProfile = await db.select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, clientUser.id))
    .get()

  // Merge client data for compatibility
  const clientJourney = {
    ...clientJourneyRecord,
    ...clientUser,
    ...(clientProfile || {}),
    client_id: clientJourneyRecord.clientId,
    first_name: clientUser.firstName,
    last_name: clientUser.lastName
  }

  // Get spouse information from relationships system
  let spouse: any = null
  const spouseRelationship = await db.select()
    .from(schema.people)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.people.id, schema.clientRelationships.personId)
    )
    .where(and(
      eq(schema.clientRelationships.clientId, clientJourney.client_id),
      eq(schema.clientRelationships.relationshipType, 'SPOUSE')
    ))
    .orderBy(schema.clientRelationships.ordinal)
    .limit(1)
    .get()

  if (spouseRelationship) {
    spouse = spouseRelationship.people
  }

  // Get step info to find related templates
  const step = await db.select()
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.id, stepId))
    .get()

  if (!step) {
    throw createError({
      statusCode: 404,
      message: 'Journey step not found'
    })
  }

  // Find templates that match this step's group
  // We'll look for templates whose description matches the step
  const templates = await db.select()
    .from(schema.documentTemplates)
    .where(and(
      eq(schema.documentTemplates.isActive, true),
      like(schema.documentTemplates.description, `%${step.name}%`)
    ))
    .orderBy(schema.documentTemplates.originalFileName)
    .all()

  if (!templates || templates.length === 0) {
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
    clientZipCode: clientJourney.zipCode || clientJourney.zip_code || '',
    clientEmail: clientJourney.email || '',
    clientPhone: clientJourney.phone || '',

    // Spouse info (from people/relationships system)
    spouseName: spouse ? `${spouse.firstName || ''} ${spouse.lastName || ''}`.trim() : '',
    spouseFirstName: spouse?.firstName || '',
    spouseLastName: spouse?.lastName || '',

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
  const now = new Date()

  for (const template of templates) {
    try {
      // Render template with context
      const renderedContent = renderer.render(template.content, context)

      // Create document record
      const docId = nanoid()
      await db.insert(schema.documents).values({
        id: docId,
        title: template.name,
        description: template.description,
        status: 'DRAFT',
        templateId: template.id,
        content: renderedContent,
        variableValues: JSON.stringify(context),
        requiresNotary: template.requiresNotary,
        notarizationStatus: template.requiresNotary ? 'PENDING' : 'NOT_REQUIRED',
        clientId: clientJourney.client_id,
        createdAt: now,
        updatedAt: now
      })

      generatedDocs.push({
        id: docId,
        title: template.name,
        requiresNotary: Boolean(template.requiresNotary)
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



