// AI agent endpoint for answering client questions
export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const body = await readBody(event)
  const aiAgent = useAIAgent()

  const { question, stepProgressId, clientJourneyId } = body

  if (!question) {
    throw createError({
      statusCode: 400,
      message: 'Question is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get context if provided
  let context: any = {}

  if (clientJourneyId) {
    // Get client journey
    const clientJourney = await db.select()
      .from(schema.clientJourneys)
      .where(eq(schema.clientJourneys.id, clientJourneyId))
      .get()

    if (clientJourney) {
      // Get journey name
      const journey = await db.select({ name: schema.journeys.name })
        .from(schema.journeys)
        .where(eq(schema.journeys.id, clientJourney.journeyId))
        .get()

      // Get step name if exists
      let stepName = null
      if (clientJourney.currentStepId) {
        const step = await db.select({ name: schema.journeySteps.name })
          .from(schema.journeySteps)
          .where(eq(schema.journeySteps.id, clientJourney.currentStepId))
          .get()
        stepName = step?.name || null
      }

      // Get client name
      const client = await db.select({ firstName: schema.users.firstName })
        .from(schema.users)
        .where(eq(schema.users.id, clientJourney.clientId))
        .get()

      context = {
        journeyName: journey?.name || null,
        stepName,
        clientName: client?.firstName || null
      }
    }
  }

  // Search for relevant FAQ entries
  const faqs = await db.select({
    question: schema.faqLibrary.question,
    answer: schema.faqLibrary.answer
  })
    .from(schema.faqLibrary)
    .where(eq(schema.faqLibrary.isActive, true))
    .orderBy(desc(schema.faqLibrary.viewCount))
    .limit(3)
    .all()

  if (faqs.length > 0) {
    context.faqContext = faqs.map((faq) =>
      `Q: ${faq.question}\nA: ${faq.answer}`
    )
  }

  // Get AI response
  const response = await aiAgent.answerQuestion(question, context)

  // If there's a step progress ID, save to conversation
  if (stepProgressId) {
    const { nanoid } = await import('nanoid')
    const now = new Date()

    // Save user question
    await db.insert(schema.bridgeConversations).values({
      id: nanoid(),
      stepProgressId,
      userId: user.id,
      message: question,
      isAiResponse: false,
      createdAt: now
    })

    // Save AI response
    await db.insert(schema.bridgeConversations).values({
      id: nanoid(),
      stepProgressId,
      userId: null,
      message: response.message,
      isAiResponse: true,
      metadata: JSON.stringify({
        confidence: response.confidence,
        escalate: response.escalate,
        suggestedActions: response.suggestedActions
      }),
      createdAt: now
    })
  }

  return response
})



