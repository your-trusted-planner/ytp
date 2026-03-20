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
    }
    catch (error: any) {
      // Handle authentication errors (401 only — not 403 which is authorization)
      // Skip redirect on public pages where 401 is expected
      if (error?.statusCode === 401) {
        const currentPath = window.location.pathname
        const isPublicPage = currentPath.startsWith('/book') ||
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath === '/forgot-password' ||
          currentPath === '/reset-password'

        if (!isPublicPage) {
          const reason = error?.data?.reason
          let redirectUrl = '/login'

          if (reason === 'deleted') {
            console.warn('User account deleted, redirecting to login')
            redirectUrl = '/login?reason=deleted'
          }
          else {
            redirectUrl = '/login?reason=invalid'
          }

          await navigateTo(redirectUrl)
        }
        throw error
      }

      // Handle disabled accounts specifically (403 with reason=disabled)
      if (error?.statusCode === 403 && error?.data?.reason === 'disabled') {
        console.warn('User account disabled, redirecting to login')
        await navigateTo('/login?reason=disabled')
        throw error
      }

      // Re-throw other errors
      throw error
    }
  }) as typeof originalFetch

  // Also handle Vue errors globally (401 only)
  nuxtApp.hook('vue:error', (error: any) => {
    if (error?.statusCode === 401) {
      navigateTo('/login')
    }
  })
})
