import { getPersonConsent } from '../../../../utils/marketing-consent'

export default defineEventHandler(async (event) => {
  const personId = getRouterParam(event, 'personId')
  if (!personId) throw createError({ statusCode: 400, message: 'Missing personId' })

  const consent = await getPersonConsent(personId)

  return { consent }
})
