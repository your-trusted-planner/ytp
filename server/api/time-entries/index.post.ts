// Create a new time entry
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { resolveHourlyRate, calculateTimeEntryAmount } from '../../utils/billing-rates'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

const createTimeEntrySchema = z.object({
  matterId: z.string().min(1),
  hours: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Hours must be a valid decimal number'),
  description: z.string().min(1),
  workDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  isBillable: z.boolean().default(true),
  catalogId: z.string().optional() // For rate resolution
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = createTimeEntrySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { matterId, hours, description, workDate, isBillable, catalogId } = parsed.data

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Verify matter exists
  const [matter] = await db
    .select({ id: schema.matters.id, title: schema.matters.title })
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .limit(1)

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Resolve hourly rate
  const { rate, source } = await resolveHourlyRate({
    matterId,
    userId: user.id,
    catalogId
  })

  // Calculate amount
  const amount = isBillable ? calculateTimeEntryAmount(hours, rate) : 0

  const timeEntryId = nanoid()
  const now = new Date()
  const workDateObj = new Date(workDate)

  await db.insert(schema.timeEntries).values({
    id: timeEntryId,
    userId: user.id,
    matterId,
    hours,
    description: description.trim(),
    workDate: workDateObj,
    isBillable,
    hourlyRate: rate,
    amount,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now
  })

  // Log the activity
  const matterName = await resolveEntityName('matter', matterId)

  await logActivity({
    type: 'TIME_ENTRY_CREATED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: matterId, name: matterName } : undefined,
    event,
    details: {
      timeEntryId,
      hours,
      hourlyRate: rate,
      rateSource: source,
      amount,
      isBillable
    }
  })

  // Fetch the created entry with related info
  const createdEntries = await db
    .select({
      id: schema.timeEntries.id,
      userId: schema.timeEntries.userId,
      matterId: schema.timeEntries.matterId,
      hours: schema.timeEntries.hours,
      description: schema.timeEntries.description,
      workDate: schema.timeEntries.workDate,
      isBillable: schema.timeEntries.isBillable,
      hourlyRate: schema.timeEntries.hourlyRate,
      amount: schema.timeEntries.amount,
      status: schema.timeEntries.status,
      createdAt: schema.timeEntries.createdAt,
      updatedAt: schema.timeEntries.updatedAt,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      matterTitle: schema.matters.title
    })
    .from(schema.timeEntries)
    .leftJoin(schema.users, eq(schema.timeEntries.userId, schema.users.id))
    .leftJoin(schema.matters, eq(schema.timeEntries.matterId, schema.matters.id))
    .where(eq(schema.timeEntries.id, timeEntryId))
    .limit(1)

  const createdEntry = createdEntries[0]
  if (!createdEntry) {
    throw createError({
      statusCode: 500,
      message: 'Failed to retrieve created time entry'
    })
  }

  return {
    timeEntry: {
      id: createdEntry.id,
      userId: createdEntry.userId,
      userName: [createdEntry.userFirstName, createdEntry.userLastName].filter(Boolean).join(' ') || 'Unknown',
      matterId: createdEntry.matterId,
      matterTitle: createdEntry.matterTitle || 'Unknown Matter',
      hours: createdEntry.hours,
      description: createdEntry.description,
      workDate: createdEntry.workDate,
      isBillable: createdEntry.isBillable,
      hourlyRate: createdEntry.hourlyRate,
      amount: createdEntry.amount,
      status: createdEntry.status,
      createdAt: createdEntry.createdAt,
      updatedAt: createdEntry.updatedAt
    },
    rateInfo: {
      rate,
      source
    }
  }
})
