// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss'
  ],

  // https://devtools.nuxt.com
  devtools: { enabled: true },

  // Env variables - https://nuxt.com/docs/getting-started/configuration#environment-variables-and-private-tokens
  runtimeConfig: {
    public: {
      appName: 'Your Trusted Planner - Client Portal'
    },
    // Private keys (only available on the server)
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  },
  
  compatibilityDate: '2024-11-12',

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
  },

  // Nitro config
  nitro: {
    experimental: {
      tasks: true
    }
  }
})
