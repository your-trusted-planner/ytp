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
  const db = hubDatabase()

  const faq = {
    id: nanoid(),
    journey_id: body.journeyId || null,
    step_id: body.stepId || null,
    category: body.category || null,
    question: body.question,
    answer: body.answer,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    view_count: 0,
    helpful_count: 0,
    unhelpful_count: 0,
    is_active: 1,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO faq_library (
      id, journey_id, step_id, category, question, answer, tags,
      view_count, helpful_count, unhelpful_count, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    faq.id,
    faq.journey_id,
    faq.step_id,
    faq.category,
    faq.question,
    faq.answer,
    faq.tags,
    faq.view_count,
    faq.helpful_count,
    faq.unhelpful_count,
    faq.is_active,
    faq.created_at,
    faq.updated_at
  ).run()

  return { faq }
})

