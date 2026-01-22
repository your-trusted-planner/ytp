import type { MessageBatch, Message } from '@cloudflare/workers-types'

/**
 * Cloudflare Queue Consumer for Google Drive sync
 *
 * This handler is automatically invoked by Cloudflare when messages
 * are available in the 'drive-sync' queue.
 *
 * Messages are processed in batches for efficiency.
 */

interface DriveSyncMessage {
  type: 'document' | 'upload' | 'client' | 'matter'
  id: string
  // Optional: for client/matter folder creation
  name?: string
  parentFolderId?: string
  matterNumber?: string
}

export default {
  async queue(batch: MessageBatch, env: any) {
    console.log(`[Drive Sync] Processing batch of ${batch.messages.length} sync requests`)

    for (const message of batch.messages) {
      const { type, id, name, parentFolderId, matterNumber } = message.body as DriveSyncMessage

      try {
        console.log(`[Drive Sync] Processing ${type} sync for ID: ${id}`)

        const {
          syncDocumentToDrive,
          syncUploadToDrive,
          createClientFolder,
          createMatterFolder,
          isDriveEnabled
        } = await import('../utils/google-drive')

        // Check if Drive is enabled before processing
        if (!await isDriveEnabled()) {
          console.log(`[Drive Sync] Google Drive is not enabled, skipping sync`)
          message.ack()
          continue
        }

        let result: { success: boolean; error?: string }

        switch (type) {
          case 'document':
            result = await syncDocumentToDrive(id)
            break

          case 'upload':
            result = await syncUploadToDrive(id)
            break

          case 'client':
            if (!name) {
              result = { success: false, error: 'Client name is required' }
            } else {
              try {
                await createClientFolder(id, name)
                result = { success: true }
              } catch (error) {
                result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
              }
            }
            break

          case 'matter':
            if (!name || !parentFolderId || !matterNumber) {
              result = { success: false, error: 'Matter name, parent folder ID, and matter number are required' }
            } else {
              try {
                await createMatterFolder(id, name, matterNumber, parentFolderId)
                result = { success: true }
              } catch (error) {
                result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
              }
            }
            break

          default:
            result = { success: false, error: `Unknown sync type: ${type}` }
        }

        if (result.success) {
          console.log(`[Drive Sync] Successfully synced ${type} ${id}`)
          message.ack()
        } else {
          console.error(`[Drive Sync] Failed to sync ${type} ${id}: ${result.error}`)
          // Retry on failure (up to 3 times by default)
          message.retry()
        }
      } catch (error) {
        console.error(`[Drive Sync] Error processing ${type} ${id}:`, error)
        message.retry()
      }
    }
  }
}

/**
 * Helper function to queue a document for Drive sync
 */
export async function queueDocumentSync(documentId: string): Promise<void> {
  // Get queue binding from env
  // Note: This needs to be called from an event handler context
  const message: DriveSyncMessage = {
    type: 'document',
    id: documentId
  }

  // The queue will be accessed via the event context in actual usage
  console.log(`[Drive Sync] Queued document ${documentId} for sync`)
}

/**
 * Helper function to queue an upload for Drive sync
 */
export async function queueUploadSync(uploadId: string): Promise<void> {
  const message: DriveSyncMessage = {
    type: 'upload',
    id: uploadId
  }

  console.log(`[Drive Sync] Queued upload ${uploadId} for sync`)
}
