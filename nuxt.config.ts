// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-02',
  // Use app/ directory for Nuxt 4 structure
  // srcDir: 'app',

  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@pinia/nuxt'
  ],

  // Disable auto-import of password functions from nuxt-auth-utils
  // We use our own bcryptjs implementations instead
  imports: {
    presets: [
      {
        from: 'nuxt-auth-utils',
        imports: ['getUserSession', 'setUserSession', 'clearUserSession', 'requireUserSession']
      }
    ]
  },

  // https://devtools.nuxt.com
  devtools: { enabled: true },

  // Env variables - https://nuxt.com/docs/getting-started/configuration#environment-variables-and-private-tokens
  runtimeConfig: {
    public: {
      appName: 'Your Trusted Planner - Client Portal',
      gitCommit: process.env.NUXT_GIT_COMMIT,
      buildDate: process.env.NUXT_BUILD_DATE,
      // Firebase client configuration (public)
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || ''
    },
    // Private keys (only available on the server)
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    seedToken: process.env.NUXT_SEED_TOKEN || '',
    pandaDocApiKey: process.env.PANDADOC_API_KEY || '',
    pandaDocSandbox: process.env.PANDADOC_SANDBOX === 'true',
    // LawPay OAuth2 credentials
    lawPayClientId: process.env.LAWPAY_CLIENT_ID || '',
    lawPayClientSecret: process.env.LAWPAY_CLIENT_SECRET || '',
    lawPayRedirectUri: process.env.LAWPAY_REDIRECT_URI || '',
    // Google Calendar service account (domain-wide delegation)
    googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
    // Firebase Admin SDK (server-only)
    firebaseServiceAccount: process.env.NUXT_FIREBASE_SERVICE_ACCOUNT || '',
    // Resend email service
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'Your Trusted Planner <noreply@yourtrustedplanner.com>',
    // Identity verification mode: 'attestation', 'kba', 'manual', 'persona'
    identityVerificationMode: process.env.IDENTITY_VERIFICATION_MODE || 'attestation',
    // Master encryption key for API credentials (local dev only - use Secrets Store in production)
    ytpMasterKey: process.env.YTP_MASTER_KEY || ''
  },

  // Nitro config
  nitro: {
    preset: 'cloudflare-module', // Deploy to Cloudflare Workers
    experimental: {
      tasks: true,
      openAPI: true
    }
  },

  // NuxtHub configuration for Cloudflare D1, KV, and R2
  hub: {
    db: 'sqlite',
    blob: true,
    kv: true
  },

  // Development config
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
        commaDangle: 'never'
      }
    }
  },

  // Tailwind
  tailwindcss: {
    configPath: 'tailwind.config.ts'
  },

  // Global CSS
  css: [
    '~/assets/css/toast.css'
  ]
})
