import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Only initialize if Firebase config is provided
  if (!config.public.firebaseApiKey || !config.public.firebaseProjectId) {
    console.log('[Firebase] No configuration found, skipping initialization')
    return {
      provide: {
        firebaseApp: null,
        firebaseAuth: null
      }
    }
  }

  // Initialize Firebase if not already done
  if (!getApps().length) {
    firebaseApp = initializeApp({
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId
    })
    firebaseAuth = getAuth(firebaseApp)
    console.log('[Firebase] Initialized successfully')
  } else {
    firebaseApp = getApps()[0]
    firebaseAuth = getAuth(firebaseApp)
  }

  return {
    provide: {
      firebaseApp,
      firebaseAuth
    }
  }
})
