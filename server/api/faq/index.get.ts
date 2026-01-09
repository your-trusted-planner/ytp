// Get FAQ entries
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, or, like, isNull, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const conditions = [eq(schema.faqLibrary.isActive, true)]

  if (query.journeyId) {
    conditions.push(or(
      eq(schema.faqLibrary.journeyId, query.journeyId as string),
      isNull(schema.faqLibrary.journeyId)
    )!)
  }

  if (query.stepId) {
    conditions.push(or(
      eq(schema.faqLibrary.stepId, query.stepId as string),
      isNull(schema.faqLibrary.stepId)
    )!)
  }

  if (query.category) {
    conditions.push(eq(schema.faqLibrary.category, query.category as string))
  }

  if (query.search) {
    const searchTerm = `%${query.search}%`
    conditions.push(or(
      like(schema.faqLibrary.question, searchTerm),
      like(schema.faqLibrary.answer, searchTerm),
      like(schema.faqLibrary.tags, searchTerm)
    )!)
  }

  const faqs = await db.select()
    .from(schema.faqLibrary)
    .where(and(...conditions))
    .orderBy(
      desc(schema.faqLibrary.viewCount),
      desc(schema.faqLibrary.helpfulCount)
    )
    .limit(query.limit ? parseInt(query.limit as string) : 20)
    .all()

  return {
    faqs
  }
})



