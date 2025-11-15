import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { schema } from '../../database'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = query.email as string

  if (!email) {
    return { error: 'Email parameter required' }
  }

  try {
    const db = hubDatabase()
    const drizzleDb = drizzle(db, { schema })

    const user = await drizzleDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()

    if (!user) {
      return { found: false }
    }

    // Check if the password hash looks like bcrypt
    const isBcrypt = user.password?.startsWith('$2')

    return {
      found: true,
      email: user.email,
      role: user.role,
      passwordHashPrefix: user.password?.substring(0, 10),
      isBcryptHash: isBcrypt,
      passwordLength: user.password?.length
    }
  } catch (error: any) {
    return { error: error.message }
  }
})
