/**
 * App Config Plugin
 *
 * Fetches application configuration (Google Drive status, etc.) on app initialization.
 * This runs once when the app starts, ensuring the config is available before
 * components render.
 */

export default defineNuxtPlugin(async () => {
  const appConfigStore = useAppConfigStore()

  // Fetch config on app init (only on client-side)
  await appConfigStore.fetchConfig()
})
