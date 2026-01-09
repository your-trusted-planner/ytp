import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'

let adminApp: App | null = null

function getFirebaseAdmin(): App | null {
  // Already initialized
  if (adminApp) {
    return adminApp
  }

  // Check if any apps exist
  const apps = getApps()
  if (apps.length > 0) {
    adminApp = apps[0]
    return adminApp
  }

  // Get service account from runtime config
  const config = useRuntimeConfig()
  const serviceAccountJson = config.firebaseServiceAccount

  if (!serviceAccountJson) {
    console.warn('[Firebase Admin] No service account configured')
    return null
  }

  try {
    // Handle both string (needs parsing) and object (already parsed by Nuxt)
    const serviceAccount = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson

    adminApp = initializeApp({
      credential: cert(serviceAccount)
    })

    console.log('[Firebase Admin] Initialized successfully')
    return adminApp
  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize:', error)
    return null
  }
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken | null> {
  const app = getFirebaseAdmin()

  if (!app) {
    throw new Error('Firebase Admin not initialized. Check NUXT_FIREBASE_SERVICE_ACCOUNT environment variable.')
  }

  try {
    const auth = getAuth(app)
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error: any) {
    console.error('[Firebase Admin] Token verification failed:', error.message)
    return null
  }
}
