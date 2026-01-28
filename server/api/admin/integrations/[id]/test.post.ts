/**
 * POST /api/admin/integrations/:id/test
 * Test connection to an integration
 *
 * Decrypts credentials and makes a simple API call to verify they work.
 * Updates the integration status and lastTestedAt.
 */

import { eq } from 'drizzle-orm'
import { kv } from '@nuxthub/kv'
import { useDrizzle, schema } from '../../../../db'
import { decrypt } from '../../../../utils/encryption'
import { LawmaticsClient, LawmaticsApiError, RateLimitError } from '../../../../utils/lawmatics-client'

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Integration ID is required'
    })
  }

  const db = useDrizzle()

  // Fetch integration
  const integration = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, id))
    .get()

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'Integration not found'
    })
  }

  if (!integration.credentialsKey) {
    throw createError({
      statusCode: 400,
      message: 'Integration has no credentials configured'
    })
  }

  // Get credentials from KV
  const credentialsData = await kv.get(integration.credentialsKey)

  if (!credentialsData) {
    // Credentials key exists but no data - mark as error
    await db.update(schema.integrations)
      .set({
        status: 'ERROR',
        lastErrorMessage: 'Credentials not found in storage',
        lastTestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.id, id))

    return {
      success: false,
      error: 'Credentials not found in storage. Please reconfigure the integration.'
    }
  }

  // KV may return parsed object or JSON string depending on how it was stored
  const credentials: { accessToken: string } = typeof credentialsData === 'string'
    ? JSON.parse(credentialsData)
    : credentialsData as { accessToken: string }

  if (!credentials.accessToken) {
    await db.update(schema.integrations)
      .set({
        status: 'ERROR',
        lastErrorMessage: 'Invalid credentials format',
        lastTestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.id, id))

    return {
      success: false,
      error: 'Invalid credentials format. Please reconfigure the integration.'
    }
  }

  // Decrypt the access token
  let decryptedToken: string
  try {
    decryptedToken = await decrypt(event, credentials.accessToken)
  } catch (decryptError) {
    await db.update(schema.integrations)
      .set({
        status: 'ERROR',
        lastErrorMessage: 'Failed to decrypt credentials',
        lastTestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.id, id))

    return {
      success: false,
      error: 'Failed to decrypt credentials. The encryption key may have changed.'
    }
  }

  // Test connection based on integration type
  let testResult: { success: boolean; error?: string; details?: Record<string, any> }

  switch (integration.type) {
    case 'LAWMATICS':
      testResult = await testLawmaticsConnection(decryptedToken)
      break
    case 'RESEND':
      testResult = await testResendConnection(decryptedToken)
      break
    case 'WEALTHCOUNSEL':
    case 'CLIO':
      // Placeholder for future integrations
      testResult = {
        success: false,
        error: `Testing for ${integration.type} is not yet implemented`
      }
      break
    default:
      testResult = {
        success: false,
        error: `Unknown integration type: ${integration.type}`
      }
  }

  // Update integration status
  const now = new Date()
  await db.update(schema.integrations)
    .set({
      status: testResult.success ? 'CONNECTED' : 'ERROR',
      lastErrorMessage: testResult.error || null,
      lastTestedAt: now,
      updatedAt: now
    })
    .where(eq(schema.integrations.id, id))

  if (testResult.success) {
    return {
      success: true,
      message: 'Connection successful',
      details: testResult.details
    }
  } else {
    return {
      success: false,
      error: testResult.error
    }
  }
})

/**
 * Test Resend API connection
 */
async function testResendConnection(
  apiKey: string
): Promise<{ success: boolean; error?: string; details?: Record<string, any> }> {
  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Please check your Resend API key.'
        }
      }
      const errorText = await response.text()
      return {
        success: false,
        error: `API error (${response.status}): ${errorText}`
      }
    }

    const data = await response.json() as { data?: Array<{ id: string; name: string }> }
    return {
      success: true,
      details: {
        message: 'Successfully connected to Resend API',
        domainCount: data.data?.length || 0,
        domains: data.data?.map(d => d.name) || []
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Test Lawmatics API connection
 */
async function testLawmaticsConnection(
  accessToken: string
): Promise<{ success: boolean; error?: string; details?: Record<string, any> }> {
  try {
    const client = new LawmaticsClient(accessToken)
    const result = await client.testConnection()

    if (result.success) {
      // Get entity counts for additional info
      try {
        const counts = await client.getEntityCounts()
        return {
          success: true,
          details: {
            message: 'Successfully connected to Lawmatics API',
            entityCounts: counts
          }
        }
      } catch {
        // Counts failed but connection worked
        return {
          success: true,
          details: {
            message: 'Successfully connected to Lawmatics API'
          }
        }
      }
    } else {
      return {
        success: false,
        error: result.error || 'Connection test failed'
      }
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        success: false,
        error: 'Rate limited by Lawmatics API. Please try again later.'
      }
    }

    if (error instanceof LawmaticsApiError) {
      if (error.statusCode === 401) {
        return {
          success: false,
          error: 'Invalid API credentials. Please check your access token.'
        }
      }
      return {
        success: false,
        error: `API error (${error.statusCode}): ${error.message}`
      }
    }

    return {
      success: false,
      error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
