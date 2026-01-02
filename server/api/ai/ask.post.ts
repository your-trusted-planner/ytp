// AI agent endpoint for answering client questions
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody(event)
  const aiAgent = useAIAgent()
  const db = hubDatabase()

  const { question, stepProgressId, clientJourneyId } = body

  if (!question) {
    throw createError({
      statusCode: 400,
      message: 'Question is required'
    })
  }

  // Get context if provided
  let context: any = {}

  if (clientJourneyId) {
    const clientJourney = await db.prepare(`
      SELECT 
        cj.*,
        j.name as journey_name,
        js.name as step_name,
        u.first_name as client_first_name
      FROM client_journeys cj
      JOIN journeys j ON cj.journey_id = j.id
      LEFT JOIN journey_steps js ON cj.current_step_id = js.id
      JOIN users u ON cj.client_id = u.id
      WHERE cj.id = ?
    `).bind(clientJourneyId).first()

    if (clientJourney) {
      context = {
        journeyName: clientJourney.journey_name,
        stepName: clientJourney.step_name,
        clientName: clientJourney.client_first_name
      }
    }
  }

  // Search for relevant FAQ entries
  const faqs = await db.prepare(`
    SELECT question, answer
    FROM faq_library
    WHERE is_active = 1
    ORDER BY view_count DESC
    LIMIT 3
  `).all()

  if (faqs.results?.length) {
    context.faqContext = faqs.results.map((faq: any) => 
      `Q: ${faq.question}\nA: ${faq.answer}`
    )
  }

  // Get AI response
  const response = await aiAgent.answerQuestion(question, context)

  // If there's a step progress ID, save to conversation
  if (stepProgressId) {
    const { nanoid } = await import('nanoid')
    
    // Save user question
    await db.prepare(`
      INSERT INTO bridge_conversations (
        id, step_progress_id, user_id, message, is_ai_response, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      nanoid(),
      stepProgressId,
      user.id,
      question,
      0,
      Date.now()
    ).run()

    // Save AI response
    await db.prepare(`
      INSERT INTO bridge_conversations (
        id, step_progress_id, user_id, message, is_ai_response, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nanoid(),
      stepProgressId,
      null,
      response.message,
      1,
      JSON.stringify({
        confidence: response.confidence,
        escalate: response.escalate,
        suggestedActions: response.suggestedActions
      }),
      Date.now()
    ).run()
  }

  return response
})



