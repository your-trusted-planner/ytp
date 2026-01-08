/**
 * Global error handler for authentication errors
 * Intercepts 401/403 responses and redirects to login
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Add global fetch interceptor
  const originalFetch = globalThis.$fetch

  globalThis.$fetch = (async (url: any, options?: any) => {
    try {
      return await originalFetch(url, options)
    } catch (error: any) {
      // Handle authentication errors
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        // Check for specific reasons
        const reason = error?.data?.reason
        let redirectUrl = '/login'

        if (reason === 'deleted') {
          console.warn('User account deleted, redirecting to login')
          redirectUrl = '/login?reason=deleted'
        } else if (reason === 'disabled') {
          console.warn('User account disabled, redirecting to login')
          redirectUrl = '/login?reason=disabled'
        } else {
          redirectUrl = '/login?reason=invalid'
        }

        // Redirect to login page with reason
        await navigateTo(redirectUrl)
        throw error
      }

      // Re-throw other errors
      throw error
    }
  }) as typeof originalFetch

  // Also handle Vue errors globally
  nuxtApp.hook('vue:error', (error: any) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      navigateTo('/login')
    }
  })
})
