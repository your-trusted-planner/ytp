// Create an action item
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only lawyers/admins can create action items
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()
  
  const actionItem = {
    id: nanoid(),
    step_id: body.stepId || null, // For template-level actions
    client_journey_id: body.clientJourneyId || null, // For instance-level actions
    action_type: body.actionType, // QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY, PAYMENT, MEETING, KYC
    title: body.title,
    description: body.description || null,
    config: body.config ? JSON.stringify(body.config) : null,
    status: 'PENDING',
    assigned_to: body.assignedTo || 'CLIENT',
    due_date: body.dueDate || null,
    priority: body.priority || 'MEDIUM',
    completed_at: null,
    completed_by: null,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO action_items (
      id, step_id, client_journey_id, action_type, title, description, config,
      status, assigned_to, due_date, priority, completed_at, completed_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    actionItem.id,
    actionItem.step_id,
    actionItem.client_journey_id,
    actionItem.action_type,
    actionItem.title,
    actionItem.description,
    actionItem.config,
    actionItem.status,
    actionItem.assigned_to,
    actionItem.due_date,
    actionItem.priority,
    actionItem.completed_at,
    actionItem.completed_by,
    actionItem.created_at,
    actionItem.updated_at
  ).run()

  return { actionItem }
})

