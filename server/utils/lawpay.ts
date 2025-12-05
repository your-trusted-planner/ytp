/**
 * LawPay OAuth2 Integration
 * Documentation: https://developers.8am.com/reference/api
 */

const LAWPAY_BASE_URL = 'https://secure.lawpay.com/api/v1'
const LAWPAY_OAUTH_URL = 'https://secure.lawpay.com/oauth'

export interface LawPayTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface LawPayGatewayCredentials {
  merchant_public_key: string
  merchant_name: string
  // Add other fields as needed
}

/**
 * Generate OAuth2 authorization URL
 */
export function getLawPayAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scope: string = 'payments'
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope
  })

  return `${LAWPAY_OAUTH_URL}/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<LawPayTokenResponse> {
  const response = await fetch(`${LAWPAY_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LawPay token exchange failed: ${error}`)
  }

  return response.json()
}

/**
 * Get gateway credentials for a merchant
 */
export async function getGatewayCredentials(
  accessToken: string
): Promise<LawPayGatewayCredentials> {
  const response = await fetch(`${LAWPAY_BASE_URL}/gateway-credentials`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get gateway credentials: ${error}`)
  }

  return response.json()
}

/**
 * Create a payment transaction
 * You'll need to implement this based on your specific needs
 */
export async function createPayment(
  accessToken: string,
  merchantPublicKey: string,
  paymentData: {
    amount: number
    currency?: string
    description?: string
    // Add other payment fields as needed
  }
) {
  // TODO: Implement based on LawPay's payment creation API
  // Reference: https://developers.8am.com/reference/api
  throw new Error('Not implemented yet')
}

/**
 * Deauthorize application for a merchant
 */
export async function deauthorizeMerchant(
  accessToken: string,
  merchantPublicKey: string
): Promise<void> {
  const response = await fetch(
    `${LAWPAY_BASE_URL}/merchants/${merchantPublicKey}/deauthorize_application`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to deauthorize: ${error}`)
  }
}
