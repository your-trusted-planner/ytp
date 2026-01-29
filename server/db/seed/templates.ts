import { schema } from '../index'
import { processTemplateUpload } from '../../utils/template-upload'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedTemplateIds } from './types'

const TEMPLATE_FILES = {
  engagement: 'doc/word_document_templates/1.g Engagement Agreement_WAPA - 1 grantor.docx',
  trust: 'doc/word_document_templates/1. Grantor Trust - One Grantor - ytp v1.docx'
}

export async function seedTemplates(db: SeedDb, blob?: any): Promise<SeedTemplateIds> {
  console.log('Seeding templates...')

  const ids = SEED_IDS.templates

  // Create template folder
  await db.insert(schema.templateFolders).values({
    id: ids.folder,
    name: 'Estate Planning',
    description: 'Estate planning documents'
  }).onConflictDoNothing()

  // Template 1: Simple Will (basic HTML)
  await db.insert(schema.documentTemplates).values({
    id: ids.simpleWill,
    name: 'Simple Will',
    description: 'Basic will template',
    category: 'Will',
    folderId: ids.folder,
    content: '<h1>Last Will and Testament</h1><p>I, {{fullName}}, being of sound mind...</p>',
    variables: JSON.stringify([
      { name: 'fullName', description: 'Full legal name' },
      { name: 'address', description: 'Current address' }
    ]),
    requiresNotary: false
  }).onConflictDoNothing()

  let template2Id: string = ids.engagement
  let template3Id: string = ids.trust
  let engagementHtml: string = ''
  let trustHtml: string = ''
  let engagementDocxBuffer: ArrayBuffer | null = null
  let trustDocxBuffer: ArrayBuffer | null = null

  if (blob) {
    try {
      const projectRoot = process.cwd()

      // Load Engagement Agreement
      const engagementPath = join(projectRoot, TEMPLATE_FILES.engagement)
      const engagementFileBuffer = await readFile(engagementPath)
      engagementDocxBuffer = engagementFileBuffer.buffer.slice(
        engagementFileBuffer.byteOffset,
        engagementFileBuffer.byteOffset + engagementFileBuffer.byteLength
      )

      const engagementResult = await processTemplateUpload(
        {
          buffer: engagementDocxBuffer,
          filename: '1.g Engagement Agreement_WAPA - 1 grantor.docx',
          name: 'Engagement Agreement - WAPA (1 Grantor)',
          description: 'Wyoming Asset Protection Trust engagement letter for single grantor',
          category: 'Engagement Letter',
          folderId: ids.folder,
          skipVariableValidation: true,
          existingId: ids.engagement // Use fixed ID for idempotency
        },
        db,
        schema,
        blob
      )
      template2Id = engagementResult.id
      engagementHtml = engagementResult.html
      console.log(`  Created engagement template with ${engagementResult.variableCount} variables from DOCX`)

      // Load Trust Document
      const trustPath = join(projectRoot, TEMPLATE_FILES.trust)
      const trustFileBuffer = await readFile(trustPath)
      trustDocxBuffer = trustFileBuffer.buffer.slice(
        trustFileBuffer.byteOffset,
        trustFileBuffer.byteOffset + trustFileBuffer.byteLength
      )

      const trustResult = await processTemplateUpload(
        {
          buffer: trustDocxBuffer,
          filename: '1. Grantor Trust - One Grantor - ytp v1.docx',
          name: 'Grantor Trust - One Grantor',
          description: 'Wyoming Asset Protection Trust Declaration for single grantor',
          category: 'Trust',
          folderId: ids.folder,
          skipVariableValidation: true,
          existingId: ids.trust // Use fixed ID for idempotency
        },
        db,
        schema,
        blob
      )
      template3Id = trustResult.id
      trustHtml = trustResult.html
      console.log(`  Created trust template with ${trustResult.variableCount} variables from DOCX`)

    } catch (error) {
      console.warn('  Could not load DOCX templates, falling back to simple HTML:', error)
      const simpleEngagement = await createSimpleEngagementTemplate(db, ids.folder, ids.engagement)
      template2Id = simpleEngagement.id
      engagementHtml = simpleEngagement.html
      const simpleTrust = await createSimpleTrustTemplate(db, ids.folder, ids.trust)
      template3Id = simpleTrust.id
      trustHtml = simpleTrust.html
    }
  } else {
    console.log('  No blob storage provided, creating simple HTML templates')
    const simpleEngagement = await createSimpleEngagementTemplate(db, ids.folder, ids.engagement)
    template2Id = simpleEngagement.id
    engagementHtml = simpleEngagement.html
    const simpleTrust = await createSimpleTrustTemplate(db, ids.folder, ids.trust)
    template3Id = simpleTrust.id
    trustHtml = simpleTrust.html
  }

  return {
    folderId: ids.folder,
    template1Id: ids.simpleWill,
    template2Id,
    template3Id,
    engagementHtml,
    trustHtml,
    engagementDocxBuffer,
    trustDocxBuffer
  }
}

export async function createSimpleEngagementTemplate(db: SeedDb, folderId: string, templateId: string): Promise<{ id: string; html: string }> {
  const html = `<h1>ENGAGEMENT AGREEMENT</h1>
<h2>Wyoming Asset Protection Trust</h2>
<p><strong>Client:</strong> {{clientName}}</p>
<p><strong>Date:</strong> {{currentDate}}</p>
<hr/>
<p>This Engagement Agreement ("Agreement") is entered into between:</p>
<p><strong>Attorney:</strong> Your Trusted Planner, LLC</p>
<p><strong>Client:</strong> {{clientName}}</p>
<p><strong>Address:</strong> {{clientAddress}}, {{clientCity}}, {{clientState}} {{clientZipCode}}</p>
<h3>SCOPE OF SERVICES</h3>
<p>Attorney agrees to provide the following legal services:</p>
<ul>
<li>Formation of Wyoming Asset Protection Trust</li>
<li>Preparation of trust documents</li>
<li>Asset protection planning consultation</li>
</ul>
<h3>FEES</h3>
<p><strong>Total Fee:</strong> {{fee}}</p>
<p><strong>Payment Terms:</strong> 50% due upon signing, 50% due upon completion</p>
<h3>SIGNATURES</h3>
<p>Client Signature: {{clientSignature}}</p>
<p>Date: {{signatureDate}}</p>`

  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name: 'Engagement Agreement - WAPA',
    description: 'Wyoming Asset Protection Trust engagement letter',
    category: 'Engagement Letter',
    folderId,
    content: html,
    variables: JSON.stringify([
      'clientName', 'currentDate', 'clientAddress', 'clientCity',
      'clientState', 'clientZipCode', 'fee', 'clientSignature', 'signatureDate'
    ]),
    requiresNotary: false
  }).onConflictDoNothing()
  return { id: templateId, html }
}

export async function createSimpleTrustTemplate(db: SeedDb, folderId: string, templateId: string): Promise<{ id: string; html: string }> {
  const html = `<h1>DECLARATION OF TRUST</h1>
<h2>{{trustName}}</h2>
<p><strong>Effective Date:</strong> {{effectiveDate}}</p>
<hr/>
<h3>ARTICLE I - ESTABLISHMENT OF TRUST</h3>
<p>{{grantorName}} ("Grantor"), being a resident of {{grantorState}}, hereby establishes this irrevocable trust to be known as the "{{trustName}}" (the "Trust").</p>
<h3>ARTICLE II - TRUSTEE</h3>
<p>The initial Trustee of this Trust shall be {{trusteeName}}.</p>
<h3>ARTICLE III - BENEFICIARIES</h3>
<p>The beneficiaries of this Trust shall be as designated in Schedule A attached hereto.</p>
<h3>ARTICLE IV - TRUST PROPERTY</h3>
<p>The Grantor hereby transfers and assigns to the Trustee all property listed in Schedule B attached hereto.</p>
<h3>ARTICLE V - GOVERNING LAW</h3>
<p>This Trust shall be governed by and construed in accordance with the laws of the State of Wyoming.</p>
<h3>SIGNATURES</h3>
<p>Grantor Signature: {{grantorSignature}}</p>
<p>Date: {{signatureDate}}</p>
<p>Trustee Signature: {{trusteeSignature}}</p>
<p>Date: {{signatureDate}}</p>`

  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name: 'Trust Declaration',
    description: 'Wyoming Asset Protection Trust Declaration',
    category: 'Trust',
    folderId,
    content: html,
    variables: JSON.stringify([
      'trustName', 'effectiveDate', 'grantorName', 'grantorState',
      'trusteeName', 'grantorSignature', 'trusteeSignature', 'signatureDate'
    ]),
    requiresNotary: true
  }).onConflictDoNothing()
  return { id: templateId, html }
}
