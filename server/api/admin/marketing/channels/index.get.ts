import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  const channels = await db.select()
    .from(schema.marketingChannels)
    .orderBy(schema.marketingChannels.sortOrder)

  return { channels }
})
