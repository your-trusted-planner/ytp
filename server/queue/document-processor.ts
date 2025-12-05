import type { MessageBatch, Message } from '@cloudflare/workers-types'

/**
 * Cloudflare Queue Consumer for DOCX document processing
 *
 * This handler is automatically invoked by Cloudflare when messages
 * are available in the 'document-processing' queue.
 *
 * Messages are processed in batches for efficiency.
 */
export default {
  async queue(batch: MessageBatch, env: any) {
    console.log(`Processing batch of ${batch.messages.length} documents`)

    for (const message of batch.messages) {
      const { documentId, userId, blobPath } = message.body as {
        documentId: string
        userId: string
        blobPath: string
      }

      try {
        console.log(`Processing document ${documentId} for user ${userId}`)

        // Get database and blob storage
        const db = hubDatabase()
        const blob = hubBlob()

        // Fetch DOCX file from R2
        const file = await blob.get(blobPath)
        if (!file) {
          throw new Error(`File not found in blob storage: ${blobPath}`)
        }

        const buffer = await file.arrayBuffer()

        // Parse DOCX using our custom parser
        const { text, html, paragraphs } = parseDocx(buffer)

        // Update database with extracted content
        await db.prepare(`
          UPDATE uploaded_documents
          SET
            content_text = ?,
            content_html = ?,
            paragraph_count = ?,
            status = 'completed',
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          text,
          html,
          paragraphs.length,
          documentId
        ).run()

        console.log(`Successfully processed document ${documentId}: ${paragraphs.length} paragraphs, ${text.length} characters`)

        // Acknowledge successful processing
        message.ack()
      } catch (error) {
        console.error(`Failed to process document ${documentId}:`, error)

        // Update database with error
        try {
          const db = hubDatabase()
          await db.prepare(`
            UPDATE uploaded_documents
            SET
              status = 'failed',
              error_message = ?,
              retry_count = retry_count + 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            error instanceof Error ? error.message : 'Unknown error',
            documentId
          ).run()
        } catch (dbError) {
          console.error(`Failed to update error status for document ${documentId}:`, dbError)
        }

        // Retry message (up to 3 times by default)
        message.retry()
      }
    }
  }
}
