import { helpContent } from '../../utils/help-content'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required'
    })
  }

  const content = helpContent[slug as keyof typeof helpContent]

  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Help content not found'
    })
  }

  return { content }
})
