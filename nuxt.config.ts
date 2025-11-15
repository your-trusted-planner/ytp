// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils'
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
      appName: 'Your Trusted Planner - Client Portal'
    },
    // Private keys (only available on the server)
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    seedToken: process.env.NUXT_SEED_TOKEN || '',
    pandaDocApiKey: process.env.PANDADOC_API_KEY || '',
    pandaDocSandbox: process.env.PANDADOC_SANDBOX === 'true',
    lawPayApiKey: process.env.LAWPAY_API_KEY || '',
    lawPayMerchantId: process.env.LAWPAY_MERCHANT_ID || '',
    googleCalendarApiKey: process.env.GOOGLE_CALENDAR_API_KEY || '',
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID || ''
  },

  // Nitro config
  nitro: {
    compatibilityDate: '2024-11-12',
    experimental: {
      tasks: true,
      openAPI: true
    }
  },

  // https://hub.nuxt.com/docs/getting-started/installation#options
  hub: {
    database: true,
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
  }
})
