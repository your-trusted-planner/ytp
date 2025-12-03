// PandaDoc API integration
const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1'

export interface PandaDocDocument {
  id: string
  name: string
  status: string
  date_created: string
  date_modified: string
  expiration_date?: string
  recipients: PandaDocRecipient[]
}

export interface PandaDocRecipient {
  email: string
  first_name: string
  last_name: string
  role: string
  signing_order?: number
}

export interface NotarizationRequest {
  documentId: string
  clientEmail: string
  clientFirstName: string
  clientLastName: string
  documentTitle: string
}

class PandaDocService {
  private apiKey: string
  private isSandbox: boolean

  constructor(apiKey: string, isSandbox: boolean = false) {
    this.apiKey = apiKey
    this.isSandbox = isSandbox
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${PANDADOC_API_BASE}${endpoint}`
    const headers = {
      'Authorization': `API-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PandaDoc API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Create a document from template
  async createDocument(data: {
    name: string
    templateId?: string
    recipients: PandaDocRecipient[]
    fields?: Record<string, any>
  }): Promise<PandaDocDocument> {
    const payload: any = {
      name: data.name,
      recipients: data.recipients
    }

    if (data.templateId) {
      payload.template_uuid = data.templateId
    }

    if (data.fields) {
      payload.fields = data.fields
    }

    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  // Create notarization session
  async createNotarizationSession(data: NotarizationRequest) {
    // Create document for notarization
    const document = await this.createDocument({
      name: data.documentTitle,
      recipients: [
        {
          email: data.clientEmail,
          first_name: data.clientFirstName,
          last_name: data.clientLastName,
          role: 'Signer',
          signing_order: 1
        }
      ]
    })

    // Send document for signature
    await this.sendDocument(document.id)

    return {
      documentId: document.id,
      sessionUrl: this.getSigningUrl(document.id, data.clientEmail)
    }
  }

  // Send document for signing
  async sendDocument(documentId: string, message?: string): Promise<void> {
    await this.request(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify({
        message: message || 'Please review and sign this document',
        silent: false
      })
    })
  }

  // Get document status
  async getDocumentStatus(documentId: string): Promise<PandaDocDocument> {
    return this.request(`/documents/${documentId}`)
  }

  // Get document download URL
  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    const response = await this.request(`/documents/${documentId}/download`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    })
    return response.url
  }

  // Get signing URL for a recipient
  getSigningUrl(documentId: string, recipientEmail: string): string {
    return `https://app.pandadoc.com/s/${documentId}?email=${encodeURIComponent(recipientEmail)}`
  }

  // Upload PDF for notarization
  async uploadPdf(pdfData: Buffer, fileName: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', new Blob([pdfData], { type: 'application/pdf' }), fileName)
    formData.append('name', fileName)

    const response = await fetch(`${PANDADOC_API_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `API-Key ${this.apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to upload PDF: ${response.statusText}`)
    }

    const data = await response.json()
    return data.id
  }

  // Request notarization for a document
  async requestNotarization(documentId: string, recipientEmail: string) {
    // Update document to require notarization
    await this.request(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        metadata: {
          requires_notarization: true
        }
      })
    })

    // Send for signing/notarization
    await this.sendDocument(documentId, 'This document requires notarization. Please schedule a notary session.')

    return {
      documentId,
      signingUrl: this.getSigningUrl(documentId, recipientEmail)
    }
  }
}

// Export singleton instance
let pandaDocInstance: PandaDocService | null = null

export function usePandaDoc() {
  const config = useRuntimeConfig()
  
  if (!pandaDocInstance) {
    const apiKey = config.pandaDocApiKey || '94594783480feb0cb4837f71bfd5417928b31d73'
    const isSandbox = config.pandaDocSandbox !== false
    pandaDocInstance = new PandaDocService(apiKey, isSandbox)
  }

  return pandaDocInstance
}

export default PandaDocService
