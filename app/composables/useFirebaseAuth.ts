import {
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type Auth,
  type UserCredential
} from 'firebase/auth'

type OAuthProviderResult = {
  success: boolean
  idToken?: string
  error?: string
}

const PREFERRED_FLOW_KEY = 'firebase_auth_preferred_flow'

export function useFirebaseAuth() {
  const { $firebaseAuth } = useNuxtApp()
  const auth = $firebaseAuth as Auth | null

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function getProvider(providerId: string) {
    switch (providerId) {
      case 'google.com':
        return new GoogleAuthProvider()
      case 'facebook.com':
        return new FacebookAuthProvider()
      case 'apple.com':
        return new OAuthProvider('apple.com')
      case 'microsoft.com':
        return new OAuthProvider('microsoft.com')
      default:
        return new OAuthProvider(providerId)
    }
  }

  function getPreferredFlow(): 'popup' | 'redirect' {
    if (typeof window === 'undefined') return 'popup'
    return (localStorage.getItem(PREFERRED_FLOW_KEY) as 'popup' | 'redirect') || 'popup'
  }

  function setPreferredFlow(flow: 'popup' | 'redirect') {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERRED_FLOW_KEY, flow)
    }
  }

  async function signInWithProvider(providerId: string): Promise<OAuthProviderResult> {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' }
    }

    isLoading.value = true
    error.value = null

    const provider = getProvider(providerId)
    const preferredFlow = getPreferredFlow()

    try {
      let result: UserCredential

      if (preferredFlow === 'popup') {
        try {
          result = await signInWithPopup(auth, provider)
        } catch (popupError: any) {
          // If popup blocked, fall back to redirect
          if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
            console.log('[Firebase] Popup blocked, falling back to redirect')
            setPreferredFlow('redirect')
            await signInWithRedirect(auth, provider)
            return { success: true } // Will complete after redirect
          }
          throw popupError
        }
      } else {
        await signInWithRedirect(auth, provider)
        return { success: true } // Will complete after redirect
      }

      // Get ID token for server verification
      const idToken = await result.user.getIdToken()

      return { success: true, idToken }
    } catch (err: any) {
      console.error('[Firebase] Sign-in error:', err)
      error.value = getFirebaseErrorMessage(err.code)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function handleRedirectResult(): Promise<OAuthProviderResult> {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' }
    }

    try {
      const result = await getRedirectResult(auth)

      if (!result) {
        // No redirect result - user navigated directly to page
        return { success: false }
      }

      const idToken = await result.user.getIdToken()
      return { success: true, idToken }
    } catch (err: any) {
      console.error('[Firebase] Redirect result error:', err)
      error.value = getFirebaseErrorMessage(err.code)
      return { success: false, error: error.value }
    }
  }

  async function getIdToken(): Promise<string | null> {
    if (!auth?.currentUser) {
      return null
    }

    try {
      return await auth.currentUser.getIdToken()
    } catch {
      return null
    }
  }

  async function signOut(): Promise<void> {
    if (!auth) return

    try {
      await firebaseSignOut(auth)
    } catch (err) {
      console.error('[Firebase] Sign-out error:', err)
    }
  }

  function getFirebaseErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
      'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/internal-error': 'An internal error occurred. Please try again.'
    }

    return errorMessages[code] || 'An error occurred during sign-in. Please try again.'
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    signInWithProvider,
    handleRedirectResult,
    getIdToken,
    signOut
  }
}
