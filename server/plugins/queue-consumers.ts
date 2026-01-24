/**
 * Cloudflare Queue Consumer Plugin
 *
 * This plugin hooks into Nitro's cloudflare:queue event to process
 * messages from Cloudflare Queues. It routes messages to the appropriate
 * handler based on the queue name.
 *
 * @see https://nitro.build/guide/plugins
 * @see https://developers.cloudflare.com/queues/
 */

import lawmaticsImportHandler from '../queue/lawmatics-import'

export default defineNitroPlugin((nitroApp) => {
  // Hook into Cloudflare Queue events
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const queueName = batch.queue

    console.log(`[Queue Plugin] Received batch of ${batch.messages.length} messages from queue: ${queueName}`)

    // Route to appropriate handler based on queue name
    if (queueName.includes('lawmatics-import')) {
      await lawmaticsImportHandler.queue(batch, env)
    } else if (queueName.includes('drive-sync')) {
      // Import and call drive sync handler
      const driveSyncHandler = await import('../queue/drive-sync')
      if (driveSyncHandler.default?.queue) {
        await driveSyncHandler.default.queue(batch, env)
      }
    } else if (queueName.includes('document-generation')) {
      // Import and call document generation handler
      const docGenHandler = await import('../queue/document-processor')
      if (docGenHandler.default?.queue) {
        await docGenHandler.default.queue(batch, env)
      }
    } else if (queueName.includes('document-template-processing')) {
      // Import and call template processing handler
      const templateHandler = await import('../queue/document-processor')
      if (templateHandler.default?.queue) {
        await templateHandler.default.queue(batch, env)
      }
    } else {
      console.warn(`[Queue Plugin] No handler registered for queue: ${queueName}`)
    }
  })

  console.log('[Queue Plugin] Cloudflare Queue handlers registered')
})
