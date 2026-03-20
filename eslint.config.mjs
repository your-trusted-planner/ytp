// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
)
  .override('nuxt/stylistic', {
    rules: {
      '@stylistic/operator-linebreak': ['error', 'after']
    }
  })
