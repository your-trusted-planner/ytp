/**
 * API endpoint to bulk upload seed documents to R2
 *
 * This endpoint allows admins to upload multiple DOCX files to R2
 * which will then be processed by the seed-wydapt endpoint.
 *
 * Usage:
 *   POST /api/admin/upload-seed-documents
 *   Content-Type: multipart/form-data
 *
 *   Form fields:
 *   - documents: Multiple DOCX files
 *   - group: Document group name (e.g., "General Documents")
 */
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No files uploaded'
    })
  }

  // blob is auto-imported from hub:blob
  const uploadedFiles: Array<{ filename: string; path: string; group: string }> = []
  const errors: Array<{ filename: string; error: string }> = []

  // Get group name from form data
  let groupName = 'General Documents'
  const groupField = form.find(f => f.name === 'group')
  if (groupField && groupField.data) {
    groupName = new TextDecoder().decode(groupField.data)
  }

  // Process each file
  for (const file of form) {
    if (file.name !== 'documents' || !file.data || !file.filename) {
      continue
    }

    try {
      // Validate file type
      if (!file.filename.endsWith('.docx')) {
        errors.push({
          filename: file.filename,
          error: 'File must be a DOCX document'
        })
        continue
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.data.byteLength > maxSize) {
        errors.push({
          filename: file.filename,
          error: 'File size must be less than 10MB'
        })
        continue
      }

      // Upload to R2: seed-documents/{group}/{filename}
      const safePath = groupName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-')
      const blobPath = `seed-documents/${safePath}/${file.filename}`

      console.log(`Uploading ${file.filename} (${file.data.byteLength} bytes) to ${blobPath}`)

      // Convert to Blob for proper serialization in dev mode (Miniflare)
      const fileBlob = new Blob([file.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      await blob.put(blobPath, fileBlob)

      console.log(`Successfully uploaded ${file.filename}`)

      uploadedFiles.push({
        filename: file.filename,
        path: blobPath,
        group: groupName
      })
    } catch (error) {
      console.error(`Error uploading ${file.filename}:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push({
        filename: file.filename,
        error: errorMessage || 'Upload failed'
      })
    }
  }

  return {
    success: true,
    uploaded: uploadedFiles.length,
    files: uploadedFiles,
    errors: errors.length > 0 ? errors : undefined,
    message: `Uploaded ${uploadedFiles.length} documents to R2. Run /api/admin/seed-wydapt to process them.`
  }
})
