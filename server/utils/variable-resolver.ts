// Resolves template variable mappings against
// the database. Replaces the inline resolution
// in generate-from-template.post.ts with a
// centralized resolver that uses the `people`
// table instead of deprecated `clientProfiles`.

interface MappingEntry {
  source: string
  field: string
}

interface ResolveContext {
  clientId: string
  matterId?: string | null
}

const formatDate = (
  val: Date | number | null | undefined,
) => {
  if (!val) return ''
  return new Date(val).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )
}

const formatCurrency = (
  val: number | null | undefined,
) => {
  if (val == null) return ''
  return (val / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

export const resolveVariableMappings = async (
  mappings: Record<string, MappingEntry>,
  ctx: ResolveContext,
): Promise<Record<string, string>> => {
  const { useDrizzle, schema } = await import(
    '../db'
  )
  const { eq, and, or } = await import(
    'drizzle-orm'
  )
  const db = useDrizzle()
  const result: Record<string, string> = {}

  // Cache fetched data to avoid repeat queries
  let personData: any = null
  let spouseData: any = null
  let matterData: any = null
  let attorneyData: any = null
  let estatePlanData: any = null
  let trustData: any = null
  let roleData: any = null
  let serviceData: any = null

  // Resolve the client's personId
  const { resolveClientIds } = await import(
    './client-ids'
  )
  const resolved
    = await resolveClientIds(ctx.clientId)
  const personId = resolved?.personId

  const fetchPerson = async () => {
    if (personData || !personId) return
    personData = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, personId))
      .get()
  }

  const fetchSpouse = async () => {
    if (spouseData !== null || !personId) return
    spouseData = false // mark attempted
    const rel = await db.select()
      .from(schema.relationships)
      .where(and(
        or(
          eq(schema.relationships.fromPersonId,
            personId),
          eq(schema.relationships.toPersonId,
            personId),
        ),
        eq(schema.relationships.relationshipType,
          'SPOUSE'),
      ))
      .limit(1)
      .get()
    if (rel) {
      const spousePersonId
        = rel.fromPersonId === personId
          ? rel.toPersonId
          : rel.fromPersonId
      spouseData = await db.select()
        .from(schema.people)
        .where(
          eq(schema.people.id, spousePersonId),
        )
        .get() || false
    }
  }

  const fetchMatter = async () => {
    if (matterData || !ctx.matterId) return
    matterData = await db.select()
      .from(schema.matters)
      .where(eq(schema.matters.id, ctx.matterId))
      .get()
  }

  const fetchAttorney = async () => {
    if (attorneyData) return
    await fetchMatter()
    if (!matterData?.leadAttorneyId) return
    const user = await db.select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
      phone: schema.users.phone,
      personId: schema.users.personId,
    })
      .from(schema.users)
      .where(eq(
        schema.users.id,
        matterData.leadAttorneyId,
      ))
      .get()
    if (user) {
      attorneyData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName:
          `${user.firstName || ''} `
          + `${user.lastName || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || '',
      }
    }
  }

  const fetchEstatePlan = async () => {
    if (estatePlanData || !ctx.matterId) return
    // Find estate plan via planToMatters
    const link = await db.select()
      .from(schema.planToMatters)
      .where(
        eq(schema.planToMatters.matterId,
          ctx.matterId),
      )
      .limit(1)
      .get()
    if (!link) return
    estatePlanData = await db.select()
      .from(schema.estatePlans)
      .where(
        eq(schema.estatePlans.id,
          link.estatePlanId),
      )
      .get()
  }

  const fetchTrust = async () => {
    if (trustData) return
    await fetchEstatePlan()
    if (!estatePlanData) return
    trustData = await db.select()
      .from(schema.trusts)
      .where(
        eq(schema.trusts.estatePlanId,
          estatePlanData.id),
      )
      .limit(1)
      .get()
  }

  const fetchRoles = async () => {
    if (roleData) return
    await fetchEstatePlan()
    if (!estatePlanData) return
    const roles = await db.select({
      roleType: schema.planRoles.roleType,
      personId: schema.planRoles.personId,
      ordinal: schema.planRoles.ordinal,
    })
      .from(schema.planRoles)
      .where(
        eq(schema.planRoles.estatePlanId,
          estatePlanData.id),
      )
      .all()

    roleData = {}
    for (const role of roles) {
      if (!role.personId) continue
      const person = await db.select({
        fullName: schema.people.fullName,
      })
        .from(schema.people)
        .where(eq(schema.people.id,
          role.personId))
        .get()
      const key = `${role.roleType}Name`
        .toLowerCase()
        .replace(/_(\w)/g,
          (_, c) => c.toUpperCase())
      if (person?.fullName) {
        roleData[key] = person.fullName
      }
    }
  }

  const fetchService = async () => {
    if (serviceData || !ctx.matterId) return
    const link = await db.select({
      serviceId:
        schema.mattersToServices.serviceId,
    })
      .from(schema.mattersToServices)
      .where(
        eq(schema.mattersToServices.matterId,
          ctx.matterId),
      )
      .limit(1)
      .get()
    if (!link) return
    serviceData = await db.select()
      .from(schema.serviceCatalog)
      .where(
        eq(schema.serviceCatalog.id,
          link.serviceId),
      )
      .get()
  }

  // Resolve each mapping
  for (
    const [variable, mapping]
    of Object.entries(mappings)
  ) {
    const { source, field } = mapping

    if (source === 'person') {
      await fetchPerson()
      if (personData) {
        const val = personData[field]
        result[variable]
          = field === 'dateOfBirth'
            ? formatDate(val)
            : String(val ?? '')
      }
    }

    else if (source === 'spouse') {
      await fetchSpouse()
      if (spouseData && spouseData !== false) {
        const val = spouseData[field]
        result[variable]
          = field === 'dateOfBirth'
            ? formatDate(val)
            : String(val ?? '')
      }
    }

    else if (source === 'matter') {
      await fetchMatter()
      if (matterData) {
        result[variable]
          = String(matterData[field] ?? '')
      }
    }

    else if (source === 'attorney') {
      await fetchAttorney()
      if (attorneyData) {
        result[variable]
          = String(attorneyData[field] ?? '')
      }
    }

    else if (source === 'estatePlan') {
      await fetchEstatePlan()
      if (estatePlanData) {
        const val = estatePlanData[field]
        result[variable]
          = field === 'effectiveDate'
            ? formatDate(val)
            : String(val ?? '')
      }
    }

    else if (source === 'trust') {
      await fetchTrust()
      if (trustData) {
        const val = trustData[field]
        result[variable]
          = field === 'formationDate'
            ? formatDate(val)
            : String(val ?? '')
      }
    }

    else if (source === 'planRole') {
      await fetchRoles()
      if (roleData) {
        result[variable]
          = String(roleData[field] ?? '')
      }
    }

    else if (source === 'service') {
      await fetchService()
      if (serviceData) {
        const val = serviceData[field]
        result[variable]
          = field === 'price'
            ? formatCurrency(val)
            : String(val ?? '')
      }
    }

    else if (source === 'system') {
      if (field === 'currentDate') {
        result[variable] = formatDate(
          new Date(),
        )
      }
      else if (field === 'firmName') {
        result[variable]
          = 'Your Trusted Planner'
      }
      else if (field === 'firmPhone') {
        result[variable] = ''
      }
      else if (field === 'firmEmail') {
        result[variable]
          = 'info@yourtrustedplanner.com'
      }
    }

    // Legacy sources (backward compat)
    else if (source === 'client') {
      await fetchPerson()
      if (personData) {
        result[variable]
          = String(personData[field] ?? '')
      }
    }
  }

  return result
}
