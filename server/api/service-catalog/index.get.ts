// Get all service catalog entries
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const catalog = await db.select()
    .from(schema.serviceCatalog)
    .where(eq(schema.serviceCatalog.isActive, true))
    .orderBy(desc(schema.serviceCatalog.createdAt))
    .all()

  // Convert to snake_case for API compatibility
  return {
    catalog: catalog.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      type: item.type,
      price: item.price,
      duration: item.duration,
      consultation_fee: item.consultationFee,
      consultation_fee_enabled: item.consultationFeeEnabled ? 1 : 0,
      engagement_letter_id: item.engagementLetterId,
      workflow_steps: item.workflowSteps,
      is_active: item.isActive ? 1 : 0,
      created_at: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt,
      updated_at: item.updatedAt instanceof Date ? item.updatedAt.getTime() : item.updatedAt
    }))
  }
})
