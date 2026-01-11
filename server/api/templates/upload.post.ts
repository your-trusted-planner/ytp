import { requireRole } from '../../utils/auth'
import { processTemplateUpload } from '../../utils/template-upload'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const form = await readMultipartFormData(event)

  if (!form) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  // Extract form data
  let fileData: any = null
  let name = ''
  let description = ''
  let category = ''
  let folderId = ''

  for (const item of form) {
    if (item.name === 'file') {
      fileData = item
    } else if (item.name === 'name') {
      name = item.data.toString()
    } else if (item.name === 'description') {
      description = item.data.toString()
    } else if (item.name === 'category') {
      category = item.data.toString()
    } else if (item.name === 'folderId') {
      folderId = item.data.toString()
    }
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  const filename = fileData.filename || 'template.docx'
  const extension = filename.split('.').pop()?.toLowerCase() || ''

  if (extension !== 'docx') {
    throw createError({
      statusCode: 400,
      message: 'Only DOCX files are supported'
    })
  }

  try {
    const { useDrizzle, schema } = await import('../../db')
    const db = useDrizzle()
    // blob is auto-imported from hub:blob

    const result = await processTemplateUpload(
      {
        buffer: fileData.data.buffer,
        filename,
        name: name || undefined,
        description: description || undefined,
        category: category || undefined,
        folderId: folderId || undefined
      },
      db,
      schema,
      blob
    )

    return {
      success: true,
      template: {
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        variables: result.variables,
        variableCount: result.variableCount,
        paragraphCount: result.paragraphCount,
        requiresNotary: result.requiresNotary,
        originalFileName: result.originalFileName
      }
    }
  } catch (error) {
    console.error('Error processing template upload:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
