// Get list of additional grantors for current client
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = hubDatabase()
  
  // Get additional grantors linked to this user (as primary)
  const grantors = await db.prepare(`
    SELECT 
      ag.id as link_id,
      ag.relationship,
      ag.matter_id,
      u.id as user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone,
      u.status,
      ag.created_at
    FROM additional_grantors ag
    JOIN users u ON ag.grantor_user_id = u.id
    WHERE ag.primary_user_id = ?
    ORDER BY ag.created_at ASC
  `).bind(user.id).all()
  
  // Also check if current user is an additional grantor to find the primary
  const primaryLink = await db.prepare(`
    SELECT 
      ag.id as link_id,
      ag.relationship,
      u.id as primary_user_id,
      u.email as primary_email,
      u.first_name as primary_first_name,
      u.last_name as primary_last_name
    FROM additional_grantors ag
    JOIN users u ON ag.primary_user_id = u.id
    WHERE ag.grantor_user_id = ?
  `).bind(user.id).first()
  
  return {
    success: true,
    additionalGrantors: grantors.results || [],
    isPrimaryGrantor: !primaryLink,
    primaryGrantor: primaryLink || null
  }
})

