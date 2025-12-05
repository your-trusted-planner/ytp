# Cloudflare Self-Hosted Setup Guide

## Prerequisites
- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Logged in to Wrangler: `wrangler login`

## Step 1: Create Cloudflare Resources

### 1. Create D1 Database
```bash
wrangler d1 create ytp-db
```
Note the `database_id` from the output.

### 2. Create KV Namespaces
```bash
# General KV namespace
wrangler kv namespace create ytp-kv

# Cache KV namespace
wrangler kv namespace create ytp-cache
```
Note both `id` values from the output.

### 3. Create R2 Bucket
```bash
wrangler r2 bucket create ytp-blob
```

## Step 2: Update wrangler.jsonc

Edit `wrangler.jsonc` and add your resource IDs (uncomment the sections):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "ytp",
  "compatibility_date": "2025-09-21",
  "compatibility_flags": ["nodejs_compat"],

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ytp-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ],

  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_ID_HERE"
    },
    {
      "binding": "CACHE",
      "id": "YOUR_CACHE_ID_HERE"
    }
  ],

  "r2_buckets": [
    {
      "binding": "BLOB",
      "bucket_name": "ytp-blob"
    }
  ]
}
```

## Step 3: Database Migrations (Automatic!)

**Good news:** NuxtHub automatically handles database migrations for you! 🎉

Migrations in `server/database/migrations/*.sql` are automatically applied during:
- Development: `npx nuxt dev`
- Deployment: Build process
- Preview environments

You don't need to run `wrangler d1 migrations apply` manually. NuxtHub detects and applies them automatically during deployment.

## Step 4: Set Environment Variables

```bash
# Set secrets (do not commit these!)
wrangler secret put JWT_SECRET
wrangler secret put PANDADOC_API_KEY
wrangler secret put LAWPAY_CLIENT_ID
wrangler secret put LAWPAY_CLIENT_SECRET
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

# Set non-secret environment variables in wrangler.jsonc "vars" section
# Example:
# "vars": {
#   "PANDADOC_SANDBOX": "true"
# }
```

## Step 5: Test Deployment

```bash
# Build and deploy to Workers
pnpm run build
pnpm run deploy

# Or directly with wrangler
wrangler deploy
```

## Step 6: Set Up GitHub Actions (Optional)

The workflow in `.github/workflows/deploy.yml` will automatically deploy on push to main.

You need to add these secrets to your GitHub repository:
- `CLOUDFLARE_API_TOKEN` - Create at https://dash.cloudflare.com/profile/api-tokens
- `CLOUDFLARE_ACCOUNT_ID` - Find in Cloudflare dashboard URL

## Testing Locally with Remote Storage

```bash
# Use remote Cloudflare resources in development
npx nuxt dev --remote
```

This requires your wrangler.jsonc to be properly configured.
