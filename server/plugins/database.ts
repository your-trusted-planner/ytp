// Database plugin removed - NuxtHub 0.10.x handles migrations automatically
// To seed the database, use: pnpm run db:seed
// Or visit: http://localhost:3000/api/_dev/seed

export default defineNitroPlugin(async () => {
  // NuxtHub 0.10.x automatically:
  // 1. Applies migrations from server/db/migrations/ on startup
  // 2. Provides the db instance via hub:db
  //
  // After migrations run, manually seed with:
  // - Development: POST to /api/_dev/seed
  // - Production: POST to /api/seed-remote (with auth token)

  console.log('💾 NuxtHub database ready (migrations applied automatically)')
})

