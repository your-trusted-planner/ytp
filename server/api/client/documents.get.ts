import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : undefined
  
  const db = useDrizzle()
  
  let queryBuilder = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.clientId, user.id))
    .orderBy(desc(schema.documents.createdAt))
  
  if (limit) {
    queryBuilder = queryBuilder.limit(limit) as any
  }
  
  const documents = await queryBuilder.all()
  
  return documents
})

