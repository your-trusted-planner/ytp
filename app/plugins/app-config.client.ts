/**
 * App Config Plugin
 *
 * Fetches application configuration (Google Drive status, etc.) on app initialization.
 * This runs once when the app starts, ensuring the config is available before
 * components render.
 */

export default defineNuxtPlugin(async () => {
  // Skip config fetch on public pages — these endpoints require auth
  const route = useRoute()
  if (route.path.startsWith('/book') || route.path === '/login' || route.path === '/register' || route.path === '/forgot-password' || route.path === '/reset-password') {
    return
  }

  const appConfigStore = useAppConfigStore()
  await appConfigStore.fetchConfig()
})
