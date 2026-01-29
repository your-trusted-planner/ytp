import { schema } from '../index'
import { useTemplateRenderer } from '../../utils/template-renderer'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedMatterIds, SeedTemplateIds } from './types'

export async function seedDocuments(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  matterIds: SeedMatterIds,
  templateIds: SeedTemplateIds,
  blob?: any
): Promise<void> {
  console.log('Seeding documents...')

  const { oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { client1Id, client3Id } = userIds
  const { matter1Id, matter3Id } = matterIds
  const { template2Id, template3Id, engagementHtml, trustHtml, engagementDocxBuffer, trustDocxBuffer } = templateIds

  // Initialize template renderer for rendering documents with variables
  const renderer = useTemplateRenderer()

  // Variable values for Jane Doe's documents
  const janeEngagementVars = {
    clientName: 'Jane Doe',
    clientFullName: 'Jane Elizabeth Doe',
    clientAddress: '123 Oak Street',
    clientCity: 'Denver',
    clientState: 'Colorado',
    clientZipCode: '80202',
    serviceName: 'Wyoming Asset Protection Trust',
    fee: '$18,500',
    currentDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    effectiveDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const janeTrustVars = {
    trustName: 'Doe Family Asset Protection Trust',
    grantorName: 'Jane Doe',
    grantorFullName: 'Jane Elizabeth Doe',
    grantorState: 'Colorado',
    trusteeName: 'Jane Doe and Robert Doe',
    effectiveDate: oneMonthAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Variable values for Sarah Williams' documents
  const sarahEngagementVars = {
    clientName: 'Sarah Williams',
    clientFullName: 'Sarah Marie Williams',
    clientAddress: '456 Pine Avenue',
    clientCity: 'Cheyenne',
    clientState: 'Wyoming',
    clientZipCode: '82001',
    serviceName: 'Wyoming Asset Protection Trust',
    fee: '$18,500',
    currentDate: threeMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    effectiveDate: threeMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sarahTrustVars = {
    trustName: 'Williams Family Asset Protection Trust',
    grantorName: 'Sarah Williams',
    grantorFullName: 'Sarah Marie Williams',
    grantorState: 'Wyoming',
    trusteeName: 'Sarah Williams',
    effectiveDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Render document content from templates
  let janeEngagementContent: string
  let janeTrustContent: string
  let sarahEngagementContent: string
  let sarahTrustContent: string

  try {
    janeEngagementContent = engagementHtml ? renderer.render(engagementHtml, janeEngagementVars) : '<h1>Engagement Agreement</h1><p>Client: Jane Doe</p>'
    janeTrustContent = trustHtml ? renderer.render(trustHtml, janeTrustVars) : '<h1>Declaration of Trust</h1><p>Trust Name: Doe Family Asset Protection Trust</p>'
    sarahEngagementContent = engagementHtml ? renderer.render(engagementHtml, sarahEngagementVars) : '<h1>Engagement Agreement</h1><p>Client: Sarah Williams</p>'
    sarahTrustContent = trustHtml ? renderer.render(trustHtml, sarahTrustVars) : '<h1>Declaration of Trust</h1><p>Trust Name: Williams Family Asset Protection Trust</p>'
    console.log('  Rendered document content from templates')
  } catch (error) {
    console.warn('  Template rendering failed, using simple content:', error)
    janeEngagementContent = '<h1>Engagement Agreement</h1><p>Client: Jane Doe</p><p>Service: Wyoming Asset Protection Trust</p><p>Fee: $18,500</p>'
    janeTrustContent = '<h1>Declaration of Trust</h1><p>Trust Name: Doe Family Asset Protection Trust</p><p>Grantor: Jane Doe</p><p>Trustee: Jane Doe and Robert Doe</p>'
    sarahEngagementContent = '<h1>Engagement Agreement</h1><p>Client: Sarah Williams</p><p>Service: Wyoming Asset Protection Trust</p><p>Fee: $18,500</p>'
    sarahTrustContent = '<h1>Declaration of Trust</h1><p>Trust Name: Williams Family Asset Protection Trust</p><p>Grantor: Sarah Williams</p><p>Trustee: Sarah Williams</p>'
  }

  // Helper to create document with DOCX blob (idempotent with onConflictDoUpdate)
  async function createDocumentWithBlob(
    docId: string,
    docData: {
      title: string
      description: string
      templateId: string
      matterId: string
      content: string
      variableValues: any
      clientId: string
      status: 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'COMPLETED'
      sentAt?: Date
      viewedAt?: Date
      signedAt?: Date
      readyForSignature?: boolean
      readyForSignatureAt?: Date
    },
    docxBuffer: ArrayBuffer | null,
    filename: string
  ) {
    let docxBlobKey: string | null = null

    // Store DOCX blob if we have the buffer and blob storage
    if (docxBuffer && blob) {
      docxBlobKey = `documents/${docId}/${filename}`
      await blob.put(docxBlobKey, docxBuffer)
      console.log(`    Stored DOCX blob: ${docxBlobKey}`)
    }

    const documentValues = {
      id: docId,
      title: docData.title,
      description: docData.description,
      templateId: docData.templateId,
      matterId: docData.matterId,
      content: docData.content,
      variableValues: JSON.stringify(docData.variableValues),
      clientId: docData.clientId,
      status: docData.status,
      docxBlobKey,
      sentAt: docData.sentAt,
      viewedAt: docData.viewedAt,
      signedAt: docData.signedAt,
      readyForSignature: docData.readyForSignature ?? false,
      readyForSignatureAt: docData.readyForSignatureAt
    }

    await db.insert(schema.documents)
      .values(documentValues)
      .onConflictDoNothing()

    return docId
  }

  // Document 1: Engagement Agreement for Jane (signed)
  await createDocumentWithBlob(
    SEED_IDS.documents.jane_engagement,
    {
      title: 'Engagement Agreement - Doe Family Trust',
      description: 'WYDAPT engagement agreement for Jane Doe',
      templateId: template2Id,
      matterId: matter1Id,
      content: janeEngagementContent,
      variableValues: janeEngagementVars,
      clientId: client1Id,
      status: 'SIGNED',
      sentAt: twoMonthsAgo,
      viewedAt: twoMonthsAgo,
      signedAt: twoMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: twoMonthsAgo
    },
    engagementDocxBuffer,
    'Engagement-Agreement-Doe-Family.docx'
  )

  // Document 2: Trust Declaration for Jane (draft)
  await createDocumentWithBlob(
    SEED_IDS.documents.jane_trust,
    {
      title: 'Trust Declaration - Doe Family Trust',
      description: 'Draft trust declaration document',
      templateId: template3Id,
      matterId: matter1Id,
      content: janeTrustContent,
      variableValues: janeTrustVars,
      clientId: client1Id,
      status: 'DRAFT'
    },
    trustDocxBuffer,
    'Trust-Declaration-Doe-Family.docx'
  )

  // Document 3: Engagement Agreement for Sarah (completed)
  await createDocumentWithBlob(
    SEED_IDS.documents.sarah_engagement,
    {
      title: 'Engagement Agreement - Williams Family Trust',
      description: 'WYDAPT engagement agreement for Sarah Williams',
      templateId: template2Id,
      matterId: matter3Id,
      content: sarahEngagementContent,
      variableValues: sarahEngagementVars,
      clientId: client3Id,
      status: 'COMPLETED',
      sentAt: threeMonthsAgo,
      viewedAt: threeMonthsAgo,
      signedAt: threeMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: threeMonthsAgo
    },
    engagementDocxBuffer,
    'Engagement-Agreement-Williams-Family.docx'
  )

  // Document 4: Trust Documents for Sarah (completed)
  await createDocumentWithBlob(
    SEED_IDS.documents.sarah_trust,
    {
      title: 'Trust Declaration - Williams Family Trust',
      description: 'Completed trust declaration document',
      templateId: template3Id,
      matterId: matter3Id,
      content: sarahTrustContent,
      variableValues: sarahTrustVars,
      clientId: client3Id,
      status: 'COMPLETED',
      sentAt: twoMonthsAgo,
      viewedAt: twoMonthsAgo,
      signedAt: twoMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: twoMonthsAgo
    },
    trustDocxBuffer,
    'Trust-Declaration-Williams-Family.docx'
  )

  console.log('  Created 4 documents with rendered template content')
}
