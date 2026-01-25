import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

// Update a person
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({
      statusCode: 400,
      message: 'Person ID required'
    })
  }

  const body = await readBody(event)
  const {
    firstName,
    lastName,
    middleNames, // Array of middle names
    email,
    phone,
    address,
    city,
    state,
    zipCode,
    dateOfBirth,
    ssnLast4,
    notes
  } = body

  const db = useDrizzle()

  // Check if person exists
  const existing = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  // Compute full name with middle names
  const nameParts = [firstName]
  if (middleNames && Array.isArray(middleNames) && middleNames.length > 0) {
    nameParts.push(...middleNames)
  }
  if (lastName) {
    nameParts.push(lastName)
  }
  const fullName = nameParts.filter(Boolean).join(' ')

  // Update using Drizzle - jsonArray type handles serialization automatically
  const updateData = {
    firstName: firstName || null,
    lastName: lastName || null,
    middleNames: middleNames && Array.isArray(middleNames) ? middleNames : [],
    fullName,
    email: email || null,
    phone: phone || null,
    address: address || null,
    city: city || null,
    state: state || null,
    zipCode: zipCode || null,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    ssnLast4: ssnLast4 || null,
    notes: notes || null,
    updatedAt: new Date()
  }

  await db.update(schema.people).set(updateData).where(eq(schema.people.id, personId))

  return {
    success: true,
    person: {
      id: personId,
      ...updateData,
      dateOfBirth: dateOfBirth || null,
      updatedAt: Date.now()
    }
  }
})
