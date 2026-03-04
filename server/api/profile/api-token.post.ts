/**
 * POST /api/profile/api-token
 * Generate a new API token for the current user (replaces any existing token)
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const { sha256 } = await import('../../utils/auth')
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Generate token: ytp_ + 32 random hex chars (128 bits of entropy)
  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const token = `ytp_${hex}`

  const hash = await sha256(token)
  await db.update(schema.users).set({
    apiTokenHash: hash,
    apiTokenCreatedAt: new Date()
  }).where(eq(schema.users.id, user.id))

  return { token }
})
