import { isDatabaseAvailable } from '../../database'

export default defineEventHandler(async (event) => {
  const available = isDatabaseAvailable()
  
  return {
    databaseAvailable: available,
    hubDatabaseType: typeof hubDatabase,
    hubDatabaseExists: typeof hubDatabase !== 'undefined'
  }
})

