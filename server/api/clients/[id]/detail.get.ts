// Composite client detail endpoint
// Combines 7 individual API calls into a single response for the client detail page
// Replaces: /api/clients/:id, /api/clients/:id/matters, /api/client-journeys/client/:id,
//           /api/clients/:id/documents, /api/clients/:id/relationships,
//           /api/trust/clients/:id/balance, /api/invoices?clientId=:id&status=outstanding

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  // Authorization: lawyers/admins can view any client, clients can only view themselves
  requireClientAccess(event, clientId)

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, or, desc, inArray, and, sql } = await import('drizzle-orm')
  const { getLegacyClientIds } = await import('../../../utils/client-ids')
  const db = useDrizzle()

  // 1. Get client + person + optional user (from clients/[id].get.ts pattern)
  const clientRecord = await db.select()
    .from(schema.clientsWithStatus)
    .where(eq(schema.clientsWithStatus.id, clientId))
    .get()

  if (!clientRecord) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const person = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, clientRecord.personId))
    .get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Client person record not found'
    })
  }

  // Resolve legacy IDs once for all subsequent queries
  const allIds = await getLegacyClientIds(clientId)

  // Run all independent queries in parallel
  const [
    user,
    mattersWithStats,
    clientJourneyRows,
    documentRows,
    relationshipRows,
    trustBalanceResult,
    invoiceRows
  ] = await Promise.all([
    // Optional user record for portal access info
    db.select()
      .from(schema.users)
      .where(eq(schema.users.personId, clientRecord.personId))
      .get(),

    // 2. Matters with aggregated stats (Phase 1 pattern - 2 queries collapsed into raw SQL)
    fetchMattersWithStats(allIds),

    // 3. Client journeys (non-cancelled)
    db.select()
      .from(schema.clientJourneys)
      .where(or(...allIds.map(id => eq(schema.clientJourneys.clientId, id))))
      .orderBy(desc(schema.clientJourneys.priority), desc(schema.clientJourneys.createdAt))
      .all(),

    // 4. Documents
    db.select()
      .from(schema.documents)
      .where(or(...allIds.map(id => eq(schema.documents.clientId, id))))
      .orderBy(desc(schema.documents.createdAt))
      .all(),

    // 5. Relationships with person details
    db.select()
      .from(schema.clientRelationships)
      .where(or(...allIds.map(id => eq(schema.clientRelationships.clientId, id))))
      .orderBy(schema.clientRelationships.relationshipType, schema.clientRelationships.ordinal)
      .all(),

    // 6. Trust balance
    fetchTrustBalance(clientId, clientRecord, person),

    // 7. Outstanding invoices
    db.select({
      id: schema.invoices.id,
      matterId: schema.invoices.matterId,
      clientId: schema.invoices.clientId,
      invoiceNumber: schema.invoices.invoiceNumber,
      status: schema.invoices.status,
      subtotal: schema.invoices.subtotal,
      taxRate: schema.invoices.taxRate,
      taxAmount: schema.invoices.taxAmount,
      discountAmount: schema.invoices.discountAmount,
      totalAmount: schema.invoices.totalAmount,
      trustApplied: schema.invoices.trustApplied,
      directPayments: schema.invoices.directPayments,
      balanceDue: schema.invoices.balanceDue,
      issueDate: schema.invoices.issueDate,
      dueDate: schema.invoices.dueDate,
      sentAt: schema.invoices.sentAt,
      paidAt: schema.invoices.paidAt,
      notes: schema.invoices.notes,
      createdBy: schema.invoices.createdBy,
      createdAt: schema.invoices.createdAt,
      updatedAt: schema.invoices.updatedAt,
      matterTitle: schema.matters.title
    })
      .from(schema.invoices)
      .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
      .where(and(
        eq(schema.invoices.clientId, clientId),
        inArray(schema.invoices.status, ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'])
      ))
      .orderBy(desc(schema.invoices.createdAt))
      .all()
  ])

  // Post-process journeys: enrich with related data (batch fetch instead of N+1)
  const activeJourneys = clientJourneyRows.filter(cj => cj.status !== 'CANCELLED')
  const enrichedJourneys = await enrichJourneys(db, schema, activeJourneys)

  // Post-process relationships: enrich with person details
  const enrichedRelationships = await enrichRelationships(db, schema, relationshipRows)

  // Build response preserving backward-compatible shapes
  return {
    client: {
      id: clientRecord.id,
      personId: clientRecord.personId,
      email: person.email,
      first_name: person.firstName,
      last_name: person.lastName,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: person.fullName,
      phone: person.phone,
      avatar: user?.avatar,
      status: clientRecord.status,
      person_id: clientRecord.personId,
      userId: user?.id,
      role: user?.role,
      importMetadata: person.importMetadata || null,
      created_at: clientRecord.createdAt instanceof Date ? clientRecord.createdAt.getTime() : clientRecord.createdAt,
      updated_at: clientRecord.updatedAt instanceof Date ? clientRecord.updatedAt.getTime() : clientRecord.updatedAt
    },
    profile: {
      id: clientRecord.id,
      client_id: clientRecord.id,
      address: person.address,
      city: person.city,
      state: person.state,
      zip_code: person.zipCode,
      date_of_birth: person.dateOfBirth instanceof Date ? person.dateOfBirth.getTime() : person.dateOfBirth,
      has_minor_children: clientRecord.hasMinorChildren ? 1 : 0,
      children_info: clientRecord.childrenInfo,
      business_name: clientRecord.businessName,
      business_type: clientRecord.businessType,
      has_will: clientRecord.hasWill ? 1 : 0,
      has_trust: clientRecord.hasTrust ? 1 : 0,
      assigned_lawyer_id: clientRecord.assignedLawyerId,
      created_at: clientRecord.createdAt instanceof Date ? clientRecord.createdAt.getTime() : clientRecord.createdAt,
      updated_at: clientRecord.updatedAt instanceof Date ? clientRecord.updatedAt.getTime() : clientRecord.updatedAt,
      google_drive_folder_id: clientRecord.googleDriveFolderId,
      google_drive_folder_url: clientRecord.googleDriveFolderUrl,
      google_drive_sync_status: clientRecord.googleDriveSyncStatus,
      google_drive_sync_error: clientRecord.googleDriveSyncError,
      google_drive_last_sync_at: clientRecord.googleDriveLastSyncAt instanceof Date
        ? Math.floor(clientRecord.googleDriveLastSyncAt.getTime() / 1000)
        : clientRecord.googleDriveLastSyncAt
    },
    matters: mattersWithStats,
    journeys: enrichedJourneys,
    documents: documentRows,
    relationships: enrichedRelationships,
    trustBalance: trustBalanceResult,
    invoices: invoiceRows.map(inv => ({
      ...inv,
      clientName: person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown',
      matter_id: inv.matterId,
      client_id: inv.clientId,
      invoice_number: inv.invoiceNumber,
      tax_rate: inv.taxRate,
      tax_amount: inv.taxAmount,
      discount_amount: inv.discountAmount,
      total_amount: inv.totalAmount,
      trust_applied: inv.trustApplied,
      direct_payments: inv.directPayments,
      balance_due: inv.balanceDue,
      issue_date: inv.issueDate instanceof Date ? inv.issueDate.getTime() : inv.issueDate,
      due_date: inv.dueDate instanceof Date ? inv.dueDate.getTime() : inv.dueDate,
      sent_at: inv.sentAt instanceof Date ? inv.sentAt.getTime() : inv.sentAt,
      paid_at: inv.paidAt instanceof Date ? inv.paidAt.getTime() : inv.paidAt,
      created_by: inv.createdBy,
      created_at: inv.createdAt instanceof Date ? inv.createdAt.getTime() : inv.createdAt,
      updated_at: inv.updatedAt instanceof Date ? inv.updatedAt.getTime() : inv.updatedAt,
      client_name: person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown',
      matter_title: inv.matterTitle
    }))
  }
})

// --- Helper functions ---

/**
 * Fetch matters with aggregated stats using raw SQL (Phase 1 pattern)
 * Returns matters with services_count, active_journeys_count, total_paid, total_expected
 */
async function fetchMattersWithStats(allIds: string[]) {
  if (allIds.length === 0) return []

  const rawDb = hubDatabase()

  // Single query with correlated subqueries
  const mattersResult = await rawDb.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
      (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
    FROM matters m
    WHERE m.client_id IN (${allIds.map(() => '?').join(',')})
  `).bind(...allIds).all()

  const matters = (mattersResult.results || []) as any[]

  // Sort by status priority then creation date
  const statusPriority: Record<string, number> = {
    'OPEN': 1,
    'IN_PROGRESS': 2,
    'PENDING': 3,
    'CLOSED': 4
  }
  matters.sort((a, b) => {
    const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
    if (priorityDiff !== 0) return priorityDiff
    return (b.created_at || 0) - (a.created_at || 0)
  })

  // Batch fetch services
  const matterIds = matters.map((m: any) => m.id)
  let servicesByMatter: Record<string, any[]> = {}

  if (matterIds.length > 0) {
    const servicesResult = await rawDb.prepare(`
      SELECT mts.matter_id, mts.catalog_id, mts.engaged_at, mts.status as mts_status,
             sc.name, sc.category, sc.price
      FROM matters_to_services mts
      INNER JOIN service_catalog sc ON mts.catalog_id = sc.id
      WHERE mts.matter_id IN (${matterIds.map(() => '?').join(',')})
    `).bind(...matterIds).all()

    for (const svc of (servicesResult.results || []) as any[]) {
      if (!servicesByMatter[svc.matter_id]) servicesByMatter[svc.matter_id] = []
      servicesByMatter[svc.matter_id].push(svc)
    }
  }

  // Build response
  return matters.map((matter: any) => {
    const matterServices = servicesByMatter[matter.id] || []
    const totalExpected = matterServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0)

    return {
      id: matter.id,
      client_id: matter.client_id,
      title: matter.title,
      matter_number: matter.matter_number,
      description: matter.description,
      status: matter.status,
      lead_attorney_id: matter.lead_attorney_id,
      engagement_journey_id: matter.engagement_journey_id,
      created_at: matter.created_at,
      updated_at: matter.updated_at,
      services_count: matter.services_count || 0,
      active_journeys_count: matter.active_journeys_count || 0,
      total_paid: matter.total_paid || 0,
      total_expected: totalExpected,
      engaged_services: matterServices.map((s: any) => ({
        matter_id: s.matter_id,
        catalog_id: s.catalog_id,
        engaged_at: s.engaged_at,
        name: s.name,
        category: s.category,
        price: s.price
      }))
    }
  })
}

/**
 * Fetch trust balance for a client
 */
async function fetchTrustBalance(
  clientId: string,
  clientRecord: any,
  person: any
): Promise<number> {
  try {
    const { getClientTrustBalances } = await import('../../../utils/trust-ledger')
    const balances = await getClientTrustBalances(clientId)
    return balances.reduce((sum, b) => sum + b.balance, 0)
  } catch {
    return 0
  }
}

/**
 * Batch-enrich journeys with related data (avoids N+1)
 */
async function enrichJourneys(db: any, schema: any, journeys: any[]) {
  if (journeys.length === 0) return []

  const { eq, inArray } = await import('drizzle-orm')

  // Collect all IDs we need to look up
  const journeyIds = [...new Set(journeys.map(j => j.journeyId))]
  const stepIds = [...new Set(journeys.filter(j => j.currentStepId).map(j => j.currentStepId!))]
  const catalogIds = [...new Set(journeys.map(j => j.catalogId || j.selectedCatalogId).filter(Boolean))]
  const matterIds = [...new Set(journeys.filter(j => j.matterId).map(j => j.matterId!))]

  // Batch fetch all related data in parallel
  const [journeyInfos, stepInfos, catalogInfos, matterInfos, stepCounts] = await Promise.all([
    // Journey metadata
    journeyIds.length > 0
      ? db.select({
          id: schema.journeys.id,
          name: schema.journeys.name,
          description: schema.journeys.description,
          estimatedDurationDays: schema.journeys.estimatedDurationDays
        }).from(schema.journeys).where(inArray(schema.journeys.id, journeyIds)).all()
      : [],

    // Current step info
    stepIds.length > 0
      ? db.select({
          id: schema.journeySteps.id,
          name: schema.journeySteps.name,
          stepType: schema.journeySteps.stepType,
          stepOrder: schema.journeySteps.stepOrder
        }).from(schema.journeySteps).where(inArray(schema.journeySteps.id, stepIds)).all()
      : [],

    // Service catalog info
    catalogIds.length > 0
      ? db.select({
          id: schema.serviceCatalog.id,
          name: schema.serviceCatalog.name
        }).from(schema.serviceCatalog).where(inArray(schema.serviceCatalog.id, catalogIds as string[])).all()
      : [],

    // Matter info
    matterIds.length > 0
      ? db.select({
          id: schema.matters.id,
          title: schema.matters.title,
          matterNumber: schema.matters.matterNumber
        }).from(schema.matters).where(inArray(schema.matters.id, matterIds)).all()
      : [],

    // Step counts per journey (batch)
    journeyIds.length > 0
      ? (async () => {
          const rawDb = hubDatabase()
          const result = await rawDb.prepare(`
            SELECT journey_id, COUNT(*) as count
            FROM journey_steps
            WHERE journey_id IN (${journeyIds.map(() => '?').join(',')})
            GROUP BY journey_id
          `).bind(...journeyIds).all()
          return (result.results || []) as { journey_id: string; count: number }[]
        })()
      : []
  ])

  // Build lookup maps
  const journeyMap = new Map(journeyInfos.map((j: any) => [j.id, j]))
  const stepMap = new Map(stepInfos.map((s: any) => [s.id, s]))
  const catalogMap = new Map(catalogInfos.map((c: any) => [c.id, c]))
  const matterMap = new Map(matterInfos.map((m: any) => [m.id, m]))
  const stepCountMap = new Map(stepCounts.map((sc: any) => [sc.journey_id, sc.count]))

  // Map to response shape (matching existing snake_case format)
  return journeys.map(cj => {
    const journey = journeyMap.get(cj.journeyId)
    const currentStep = cj.currentStepId ? stepMap.get(cj.currentStepId) : null
    const serviceCatalogId = cj.catalogId || cj.selectedCatalogId
    const service = serviceCatalogId ? catalogMap.get(serviceCatalogId) : null
    const matter = cj.matterId ? matterMap.get(cj.matterId) : null

    return {
      id: cj.id,
      client_id: cj.clientId,
      matter_id: cj.matterId,
      catalog_id: cj.catalogId,
      selected_catalog_id: cj.selectedCatalogId,
      journey_id: cj.journeyId,
      current_step_id: cj.currentStepId,
      status: cj.status,
      priority: cj.priority,
      started_at: cj.startedAt instanceof Date ? cj.startedAt.getTime() : cj.startedAt,
      completed_at: cj.completedAt instanceof Date ? cj.completedAt.getTime() : cj.completedAt,
      paused_at: cj.pausedAt instanceof Date ? cj.pausedAt.getTime() : cj.pausedAt,
      created_at: cj.createdAt instanceof Date ? cj.createdAt.getTime() : cj.createdAt,
      updated_at: cj.updatedAt instanceof Date ? cj.updatedAt.getTime() : cj.updatedAt,
      journey_name: journey?.name || null,
      journey_description: journey?.description || null,
      estimated_duration_days: journey?.estimatedDurationDays || null,
      current_step_name: currentStep?.name || null,
      current_step_type: currentStep?.stepType || null,
      current_step_order: currentStep?.stepOrder || null,
      total_steps: stepCountMap.get(cj.journeyId) || 0,
      service_name: service?.name || null,
      matter_title: matter?.title || null,
      matter_number: matter?.matterNumber || null
    }
  })
}

/**
 * Enrich relationships with person details (batch fetch)
 */
async function enrichRelationships(db: any, schema: any, relationships: any[]) {
  if (relationships.length === 0) return []

  const { inArray } = await import('drizzle-orm')

  const personIds = [...new Set(relationships.map(cr => cr.personId))]
  const people = await db.select()
    .from(schema.people)
    .where(inArray(schema.people.id, personIds))
    .all()

  const personMap = new Map(people.map((p: any) => [p.id, p]))

  return relationships.map(cr => {
    const person = personMap.get(cr.personId)
    return {
      id: cr.id,
      client_id: cr.clientId,
      person_id: cr.personId,
      relationship_type: cr.relationshipType,
      ordinal: cr.ordinal,
      notes: cr.notes,
      created_at: cr.createdAt instanceof Date ? cr.createdAt.getTime() : cr.createdAt,
      updated_at: cr.updatedAt instanceof Date ? cr.updatedAt.getTime() : cr.updatedAt,
      person: person ? {
        id: person.id,
        first_name: person.firstName,
        last_name: person.lastName,
        full_name: person.fullName,
        email: person.email,
        phone: person.phone
      } : null
    }
  })
}
