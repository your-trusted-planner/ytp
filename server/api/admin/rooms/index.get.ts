import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  const roomList = await db
    .select()
    .from(schema.rooms)
    .orderBy(schema.rooms.displayOrder)
    .all()

  return roomList
})
