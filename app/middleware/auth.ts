export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth check for login page
  if (to.path === '/login') {
    return
  }
  
  // Check if user is authenticated
  const { data } = await useFetch('/api/auth/session')
  
  if (!data.value?.user) {
    return navigateTo('/login')
  }
})

