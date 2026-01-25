/**
 * GET /api/admin/integrations/lawmatics/test-pagination
 * Debug endpoint to test Lawmatics API pagination
 * Returns raw API response structure for analysis
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { kv } from '@nuxthub/kv'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  // Get Lawmatics integration
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'LAWMATICS'))
    .get()

  if (!integration || !integration.credentialsKey) {
    throw createError({
      statusCode: 404,
      message: 'Lawmatics integration not found or not configured'
    })
  }

  // Get credentials
  const { decrypt } = await import('../../../../utils/encryption')
  const credentialsData = await kv.get(integration.credentialsKey)

  if (!credentialsData) {
    throw createError({
      statusCode: 404,
      message: 'Credentials not found'
    })
  }

  const credentials: { accessToken: string } = typeof credentialsData === 'string'
    ? JSON.parse(credentialsData)
    : credentialsData as { accessToken: string }

  const decryptedToken = await decrypt(event, credentials.accessToken)

  // Make raw API calls to test pagination
  const baseUrl = 'https://api.lawmatics.com/v1'
  const testEndpoints = [
    { name: 'contacts_page1', url: `${baseUrl}/contacts?fields=all&page=1&per_page=100` },
    { name: 'contacts_page2', url: `${baseUrl}/contacts?fields=all&page=2&per_page=100` },
    { name: 'users', url: `${baseUrl}/users?fields=all&page=1&per_page=100` }
  ]

  const results: Record<string, any> = {}

  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        results[endpoint.name] = {
          error: true,
          status: response.status,
          statusText: response.statusText,
          body: await response.text()
        }
        continue
      }

      const data = await response.json()

      // Return just the structure info, not full data
      results[endpoint.name] = {
        dataCount: Array.isArray(data.data) ? data.data.length : 0,
        meta: data.meta,
        links: data.links,
        // Include first record's structure (without sensitive data)
        sampleRecordKeys: Array.isArray(data.data) && data.data[0]
          ? Object.keys(data.data[0])
          : [],
        // Raw response keys at top level
        responseKeys: Object.keys(data)
      }
    } catch (error) {
      results[endpoint.name] = {
        error: true,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }

  return {
    integration: {
      id: integration.id,
      status: integration.status
    },
    apiResults: results
  }
})
