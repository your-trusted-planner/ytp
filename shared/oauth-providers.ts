/**
 * Well-known OAuth provider presets for Firebase Identity Platform
 *
 * These providers have fixed configuration values defined by Firebase/Identity Platform.
 * Only the enabled state and display order need to be configured.
 */

export interface OAuthProviderPreset {
  providerId: string
  name: string
  logoUrl: string
  buttonColor: string
  description: string
}

/**
 * Well-known OAuth providers supported by Firebase Identity Platform
 * Provider IDs match Firebase's expected values.
 *
 * @see https://firebase.google.com/docs/auth/configure-oauth-rest-api#add-idp
 */
export const OAUTH_PROVIDER_PRESETS: Record<string, OAuthProviderPreset> = {
  'google.com': {
    providerId: 'google.com',
    name: 'Google',
    logoUrl: '/icons/google.svg',
    buttonColor: '#4285F4',
    description: 'Sign in with Google accounts'
  },
  'facebook.com': {
    providerId: 'facebook.com',
    name: 'Facebook',
    logoUrl: '/icons/facebook.svg',
    buttonColor: '#1877F2',
    description: 'Sign in with Facebook accounts'
  },
  'microsoft.com': {
    providerId: 'microsoft.com',
    name: 'Microsoft',
    logoUrl: '/icons/microsoft.svg',
    buttonColor: '#2F2F2F',
    description: 'Sign in with Microsoft/Azure AD accounts'
  },
  'apple.com': {
    providerId: 'apple.com',
    name: 'Apple',
    logoUrl: '/icons/apple.svg',
    buttonColor: '#000000',
    description: 'Sign in with Apple ID'
  },
  'github.com': {
    providerId: 'github.com',
    name: 'GitHub',
    logoUrl: '/icons/github.svg',
    buttonColor: '#24292E',
    description: 'Sign in with GitHub accounts'
  },
  'twitter.com': {
    providerId: 'twitter.com',
    name: 'X (Twitter)',
    logoUrl: '/icons/x.svg',
    buttonColor: '#000000',
    description: 'Sign in with X (Twitter) accounts'
  },
  'yahoo.com': {
    providerId: 'yahoo.com',
    name: 'Yahoo',
    logoUrl: '/icons/yahoo.svg',
    buttonColor: '#6001D2',
    description: 'Sign in with Yahoo accounts'
  }
}

/**
 * Ordered list of well-known provider IDs for display
 */
export const WELL_KNOWN_PROVIDER_IDS = [
  'google.com',
  'microsoft.com',
  'apple.com',
  'facebook.com',
  'github.com',
  'twitter.com',
  'yahoo.com'
] as const

/**
 * Check if a provider ID is a well-known preset
 */
export function isWellKnownProvider(providerId: string): boolean {
  return providerId in OAUTH_PROVIDER_PRESETS
}

/**
 * Get preset for a well-known provider, or null if not found
 */
export function getProviderPreset(providerId: string): OAuthProviderPreset | null {
  return OAUTH_PROVIDER_PRESETS[providerId] ?? null
}
