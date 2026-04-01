// Stop impersonating a client user
import { logActivity } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session.impersonating) {
    throw createError({ statusCode: 400, message: 'Not currently impersonating anyone' })
  }

  const realUser = session.user
  const impersonated = session.impersonating

  // Remove impersonation from the session.
  //
  // h3's session system caches session data in event.context.sessions and
  // setUserSession merges via defu + Object.assign — it never removes keys.
  // Even clearUserSession + setUserSession fails because getSession re-reads
  // the original request cookie after clear deletes the cache.
  //
  // The fix: directly mutate the cached session data to delete the key,
  // then call setUserSession to trigger a re-seal of the cookie.
  const cachedSession = (event.context as any).sessions?.['nuxt-session']
  if (cachedSession?.data) {
    delete cachedSession.data.impersonating
  }

  await setUserSession(event, {
    user: session.user,
    loggedInAt: session.loggedInAt
  })

  await logActivity({
    type: 'USER_IMPERSONATION_STOPPED',
    userId: realUser.id,
    userRole: realUser.role,
    target: { type: 'user', id: impersonated.userId, name: `${impersonated.firstName} ${impersonated.lastName}` },
    event,
    details: {
      impersonatedUserId: impersonated.userId,
      impersonatedEmail: impersonated.email
    }
  })

  return { success: true }
})
