import { eq, or } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { formatSensitiveDisplay } from '../../utils/sensitive-fields'
import { invertRelationshipType } from '../../utils/relationships'

// Get a specific person by ID
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({
      statusCode: 400,
      message: 'Person ID required'
    })
  }

  const db = useDrizzle()

  const person = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  // Fetch linked records, detail profiles, and relationships in parallel
  const [linkedClient, linkedUser, trustProfile, entityProfile, rawRelationships] = await Promise.all([
    db.select({
      id: schema.clients.id,
      status: schema.clients.status
    })
      .from(schema.clients)
      .where(eq(schema.clients.personId, personId))
      .get(),

    db.select({
      id: schema.users.id,
      role: schema.users.role,
      status: schema.users.status
    })
      .from(schema.users)
      .where(eq(schema.users.personId, personId))
      .get(),

    // Trust profile (only if personType is 'trust')
    person.personType === 'trust'
      ? db.select().from(schema.trusts).where(eq(schema.trusts.personId, personId)).get()
      : Promise.resolve(null),

    // Entity profile (only if personType is 'entity')
    person.personType === 'entity'
      ? db.select().from(schema.entities).where(eq(schema.entities.personId, personId)).get()
      : Promise.resolve(null),

    db.select()
      .from(schema.relationships)
      .where(
        or(
          eq(schema.relationships.fromPersonId, personId),
          eq(schema.relationships.toPersonId, personId)
        )
      )
      .all()
  ])

  // Resolve other person names for relationships
  const otherPersonIds = rawRelationships.map(r =>
    r.fromPersonId === personId ? r.toPersonId : r.fromPersonId
  ).filter((id, i, arr) => arr.indexOf(id) === i)

  const otherPeople = otherPersonIds.length > 0 ?
      await db.select({
        id: schema.people.id,
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName
      })
        .from(schema.people)
        .where(or(...otherPersonIds.map(id => eq(schema.people.id, id))))
        .all() :
      []

  const peopleMap = new Map(otherPeople.map(p => [p.id, p]))

  const relationships = rawRelationships.flatMap((r) => {
    const isOutgoing = r.fromPersonId === personId
    const otherPersonId = isOutgoing ? r.toPersonId : r.fromPersonId
    const otherPerson = peopleMap.get(otherPersonId)
    const otherPersonName = otherPerson?.fullName
      || (otherPerson?.firstName && otherPerson?.lastName
        ? `${otherPerson.firstName} ${otherPerson.lastName}`
        : 'Unknown')

    if (isOutgoing) {
      // Viewer initiated — show as stored
      return [{
        id: r.id,
        relationshipType: r.relationshipType,
        context: r.context,
        contextId: r.contextId,
        ordinal: r.ordinal,
        notes: r.notes,
        otherPersonId,
        otherPersonName,
        direction: 'outgoing' as const
      }]
    }
    else {
      // Viewer is the recipient — invert if symmetric; omit if asymmetric
      const inverse = invertRelationshipType(r.relationshipType)
      if (!inverse) return []
      return [{
        id: r.id,
        relationshipType: inverse,
        context: r.context,
        contextId: r.contextId,
        ordinal: r.ordinal,
        notes: r.notes,
        otherPersonId,
        otherPersonName,
        direction: 'incoming' as const
      }]
    }
  })

  return {
    id: person.id,
    personType: person.personType,
    // camelCase
    firstName: person.firstName,
    lastName: person.lastName,
    middleNames: person.middleNames,
    fullName: person.fullName,
    email: person.email,
    phone: person.phone,
    address: person.address,
    address2: person.address2,
    city: person.city,
    state: person.state,
    zipCode: person.zipCode,
    country: person.country,
    dateOfBirth: person.dateOfBirth ? person.dateOfBirth.getTime() : null,
    maritalStatus: person.maritalStatus,
    tinLast4: person.tinLast4,
    tinMasked: formatSensitiveDisplay('tin', person.tinLast4),
    notes: person.notes,
    importMetadata: person.importMetadata || null,
    createdAt: person.createdAt ? person.createdAt.getTime() : Date.now(),
    updatedAt: person.updatedAt ? person.updatedAt.getTime() : Date.now(),
    // Linked records
    linkedClient: linkedClient || null,
    linkedUser: linkedUser || null,
    // Detail profiles (only one will be non-null based on personType)
    trustProfile: trustProfile || null,
    entityProfile: entityProfile || null,
    relationships,
    // snake_case versions for API compatibility
    first_name: person.firstName,
    last_name: person.lastName,
    middle_names: person.middleNames,
    full_name: person.fullName,
    zip_code: person.zipCode,
    date_of_birth: person.dateOfBirth ? person.dateOfBirth.getTime() : null,
    tin_last_4: person.tinLast4,
    created_at: person.createdAt ? person.createdAt.getTime() : Date.now(),
    updated_at: person.updatedAt ? person.updatedAt.getTime() : Date.now()
  }
})
