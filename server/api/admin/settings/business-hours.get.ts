import { getDefaultBusinessHours } from '../../../utils/availability'

export default defineEventHandler(async () => {
  const hours = await getDefaultBusinessHours()
  return hours
})
