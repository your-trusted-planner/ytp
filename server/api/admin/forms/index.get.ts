import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const db = useDrizzle()

  // Get forms with field and section counts
  const forms = await db
    .select({
      id: schema.forms.id,
      name: schema.forms.name,
      slug: schema.forms.slug,
      description: schema.forms.description,
      formType: schema.forms.formType,
      isMultiStep: schema.forms.isMultiStep,
      isActive: schema.forms.isActive,
      createdAt: schema.forms.createdAt,
      updatedAt: schema.forms.updatedAt
    })
    .from(schema.forms)
    .orderBy(schema.forms.name)
    .all()

  // Get counts in bulk
  const sectionCounts = await db.all(
    sql`SELECT form_id, COUNT(*) as count FROM form_sections GROUP BY form_id`
  ) as Array<{ form_id: string; count: number }>
  const fieldCounts = await db.all(
    sql`SELECT form_id, COUNT(*) as count FROM form_fields GROUP BY form_id`
  ) as Array<{ form_id: string; count: number }>

  const sectionMap = new Map(sectionCounts.map(r => [r.form_id, r.count]))
  const fieldMap = new Map(fieldCounts.map(r => [r.form_id, r.count]))

  return forms.map(f => ({
    ...f,
    sectionCount: sectionMap.get(f.id) || 0,
    fieldCount: fieldMap.get(f.id) || 0,
    createdAt: f.createdAt ? f.createdAt.getTime() : Date.now(),
    updatedAt: f.updatedAt ? f.updatedAt.getTime() : Date.now()
  }))
})
