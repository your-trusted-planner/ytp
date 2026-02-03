import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../db'

// Create a new person
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const {
    firstName,
    lastName,
    middleNames, // Array of middle names
    email,
    phone,
    address,
    address2,
    city,
    state,
    zipCode,
    dateOfBirth,
    ssnLast4,
    notes
  } = body

  // Validation - require at least a first name
  if (!firstName) {
    throw createError({
      statusCode: 400,
      message: 'First name is required'
    })
  }

  const db = useDrizzle()
  const personId = nanoid()

  // Compute full name with middle names
  const nameParts = [firstName]
  if (middleNames && Array.isArray(middleNames) && middleNames.length > 0) {
    nameParts.push(...middleNames)
  }
  if (lastName) {
    nameParts.push(lastName)
  }
  const fullName = nameParts.filter(Boolean).join(' ')

  // Insert using Drizzle - jsonArray type handles serialization automatically
  const newPerson = {
    id: personId,
    firstName: firstName || null,
    lastName: lastName || null,
    middleNames: middleNames && Array.isArray(middleNames) ? middleNames : [],
    fullName,
    email: email || null,
    phone: phone || null,
    address: address || null,
    address2: address2 || null,
    city: city || null,
    state: state || null,
    zipCode: zipCode || null,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    ssnLast4: ssnLast4 || null,
    notes: notes || null
  }

  await db.insert(schema.people).values(newPerson)

  return {
    success: true,
    person: {
      ...newPerson,
      dateOfBirth: dateOfBirth || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }
})
