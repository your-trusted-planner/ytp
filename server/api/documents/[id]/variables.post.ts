// Update document variables and re-render content
import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const body = await readBody(event)

  if (!body.variables || typeof body.variables !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Variables object required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()
  const renderer = useTemplateRenderer()

  // Get the document
  const document = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Authorization: lawyers/admins can update any document, clients only their own
  if (user.role === 'CLIENT' && document.clientId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Get the template to re-render
  const template = await db.select()
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, document.templateId))
    .get()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  // Merge existing variable values with new ones
  const existingVariables = document.variableValues
    ? JSON.parse(document.variableValues)
    : {}
  const updatedVariables = { ...existingVariables, ...body.variables }

  console.log('[Variables] Existing variables:', existingVariables)
  console.log('[Variables] New variables from form:', body.variables)
  console.log('[Variables] Merged variables:', updatedVariables)

  // Convert flat keys with dots to nested objects for Handlebars/docxtemplater
  // e.g., { 'lead_attorney.full_name': 'value' } => { lead_attorney: { full_name: 'value' } }
  function unflattenObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}
    for (const key in obj) {
      if (key.includes('.')) {
        const keys = key.split('.')
        let current = result
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {}
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = obj[key]
      } else {
        result[key] = obj[key]
      }
    }
    return result
  }

  const nestedVariables = unflattenObject(updatedVariables)
  console.log('[Variables] Nested variables for rendering:', nestedVariables)

  // Check if template content has any variables
  const variableMatches = template.content.match(/\{\{[^}]+\}\}/g) || []
  console.log('[Variables] Found', variableMatches.length, 'variable placeholders in template content')
  if (variableMatches.length > 0) {
    console.log('[Variables] First 10 variables:', variableMatches.slice(0, 10))
  }
  console.log('[Variables] Template content preview:', template.content.substring(0, 500))

  // Re-render HTML content with updated variables
  const renderedContent = renderer.render(template.content, nestedVariables)

  console.log('[Variables] Rendered content preview:', renderedContent.substring(0, 500))

  // Regenerate DOCX if template has one
  let docxBlobKey = document.docxBlobKey
  if (template.docxBlobKey) {
    console.log('[Variables] Starting DOCX regeneration...')
    console.log('[Variables] Template blob key:', template.docxBlobKey)
    console.log('[Variables] Document blob key:', docxBlobKey)
    try {
      // Load template DOCX from blob storage
      const templateBlob = await blob.get(template.docxBlobKey)
      console.log('[Variables] Template blob loaded:', !!templateBlob)

      if (templateBlob) {
        const templateBuffer = await templateBlob.arrayBuffer()
        console.log('[Variables] Template buffer size:', templateBuffer.byteLength)

        // Generate filled DOCX using docxtemplater with nested variables
        const { generateDocx } = await import('../../../utils/docx-generator')
        console.log('[Variables] Calling generateDocx with nested variables')
        const generatedDocx = generateDocx({
          templateBuffer,
          data: nestedVariables
        })
        console.log('[Variables] Generated DOCX size:', generatedDocx.byteLength)

        // Generate blob key if document doesn't have one
        if (!docxBlobKey) {
          const sanitizedTitle = (document.title || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')
          docxBlobKey = `documents/${documentId}/${sanitizedTitle}.docx`
          console.log('[Variables] Generated new blob key:', docxBlobKey)
        }

        // Save the regenerated DOCX to blob storage
        await blob.put(docxBlobKey, generatedDocx)
        console.log('[Variables] Successfully saved regenerated DOCX to:', docxBlobKey)
      } else {
        console.warn('[Variables] Template blob not found in storage')
      }
    } catch (error) {
      console.error('[Variables] Error regenerating DOCX:', error)
      if (error instanceof Error) {
        console.error('[Variables] Error message:', error.message)
        console.error('[Variables] Error stack:', error.stack)
      }
      // Continue even if DOCX regeneration fails
    }
  } else {
    console.log('[Variables] Template has no DOCX blob key, skipping DOCX regeneration')
  }

  // Update document
  await db.update(schema.documents)
    .set({
      content: renderedContent,
      variableValues: JSON.stringify(updatedVariables),
      docxBlobKey: docxBlobKey, // Update the blob key (may have been generated)
      updatedAt: new Date()
    })
    .where(eq(schema.documents.id, documentId))

  return {
    success: true,
    document: {
      id: documentId,
      content: renderedContent,
      variables: updatedVariables
    }
  }
})



