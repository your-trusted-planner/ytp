// PandaDoc API Integration for Mobile Notarization

interface PandaDocConfig {
  apiKey: string
  sandbox: boolean
}

interface NotarizationRequest {
  documentId: string
  clientEmail: string
  clientName: string
  documentTitle: string
  documentContent: string
}

export class PandaDocService {
  private apiKey: string
  private baseUrl: string

  constructor(config: PandaDocConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.sandbox 
      ? 'https://api.pandadoc.com/public/v1'
      : 'https://api.pandadoc.com/public/v1'
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `API-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PandaDoc API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Create a notarization request
   * @see https://developers.pandadoc.com/reference/create-notarization-request
   */
  async createNotarizationRequest(request: NotarizationRequest) {
    return this.request('/notarization-requests', {
      method: 'POST',
      body: JSON.stringify({
        name: request.documentTitle,
        recipients: [
          {
            email: request.clientEmail,
            first_name: request.clientName.split(' ')[0],
            last_name: request.clientName.split(' ').slice(1).join(' '),
            role: 'Client'
          }
        ],
        tokens: [
          {
            name: 'Document.Name',
            value: request.documentTitle
          }
        ]
      })
    })
  }

  /**
   * Get notarization request details
   */
  async getNotarizationRequest(requestId: string) {
    return this.request(`/notarization-requests/${requestId}`)
  }

  /**
   * List available notaries (if using external notaries)
   */
  async listNotaries(params?: { zipCode?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.zipCode) {
      queryParams.append('zip_code', params.zipCode)
    }
    
    return this.request(`/notaries?${queryParams.toString()}`)
  }

  /**
   * Get notarization request status
   */
  async getStatus(requestId: string) {
    const request = await this.getNotarizationRequest(requestId)
    return {
      status: request.status, // 'sent', 'waiting_for_notary', 'accepted', 'live', 'completed', 'incomplete'
      notary: request.notary,
      scheduledTime: request.scheduled_time,
      completedAt: request.completed_at
    }
  }

  /**
   * Create document from template for notarization
   */
  async createDocumentFromTemplate(templateId: string, data: any) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify({
        template_uuid: templateId,
        name: data.name,
        recipients: data.recipients,
        tokens: data.tokens,
        fields: data.fields
      })
    })
  }
}

/**
 * Get configured PandaDoc service instance
 */
export function usePandaDoc() {
  const config = useRuntimeConfig()
  
  if (!config.pandaDocApiKey) {
    throw new Error('PandaDoc API key not configured')
  }
  
  return new PandaDocService({
    apiKey: config.pandaDocApiKey,
    sandbox: config.pandaDocSandbox
  })
}

