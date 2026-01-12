// Delete a template (soft or hard delete)
// MINIMAL VERSION FOR DEBUGGING CLOUDFLARE HANG

export default defineEventHandler(async (event) => {
  // Step 1: Just return immediately to test if handler is reached
  return {
    success: true,
    debug: 'minimal-v1',
    message: 'DELETE handler reached'
  }
})
