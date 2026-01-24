export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth check for public auth pages
  if (
    to.path === '/login' ||
    to.path === '/register' ||
    to.path === '/forgot-password' ||
    to.path === '/reset-password'
  ) {
    return
  }

  // Check if user is authenticated
  try {
    const { data, error } = await useFetch('/api/auth/session')

    // Handle fetch errors or invalid session
    if (error.value || !data.value?.user) {
      // Clear any client-side state
      if (process.client) {
        // Could clear localStorage/sessionStorage here if needed
      }

      return navigateTo('/login?reason=invalid')
    }
  } catch (err) {
    // Handle any unexpected errors
    console.error('Session check failed:', err)
    return navigateTo('/login?reason=invalid')
  }
})

