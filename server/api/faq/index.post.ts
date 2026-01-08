// Create FAQ entry
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  // Only lawyers/admins can create FAQs
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const faqId = nanoid()
  const now = new Date()

  await db.insert(schema.faqLibrary).values({
    id: faqId,
    journeyId: body.journeyId || null,
    stepId: body.stepId || null,
    category: body.category || null,
    question: body.question,
    answer: body.answer,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    viewCount: 0,
    helpfulCount: 0,
    unhelpfulCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  })

  const faq = {
    id: faqId,
    journey_id: body.journeyId || null,
    step_id: body.stepId || null,
    category: body.category || null,
    question: body.question,
    answer: body.answer,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    view_count: 0,
    helpful_count: 0,
    unhelpful_count: 0,
    is_active: true,
    created_at: now,
    updated_at: now
  }

  return { faq }
})



