# Your Trusted Planner - Client Portal

A modern estate planning client portal built with Nuxt 4 and NuxtHub, deployed on Cloudflare's edge infrastructure.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Open http://localhost:3000
```

**That's it!** The database auto-seeds on first request with test data.

## Test Accounts

After auto-seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@trustandlegacy.test | password123 |
| Lawyer | john.meuli@yourtrustedplanner.com | password123 |
| Lawyer | mary.parker@trustandlegacy.test | password123 |
| Staff | lisa.chen@trustandlegacy.test | password123 |
| Advisor | bob.advisor@external.test | password123 |
| Client (Active) | jane.doe@test.com | password123 |
| Client (Prospect) | michael.johnson@test.com | password123 |
| Client (Completed) | sarah.williams@test.com | password123 |

## Development Scripts

```bash
pnpm dev              # Start dev server (auto-seeds if empty)
pnpm db:seed          # Manually trigger seed via API
pnpm db:generate      # Generate migrations from schema changes
pnpm db:studio        # Open Drizzle Studio for database inspection
pnpm test             # Run unit tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm lint             # Run ESLint
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| Database | Cloudflare D1 (SQLite at edge) |
| ORM | Drizzle |
| Storage | Cloudflare R2 (blob storage) |
| Hosting | Cloudflare Workers + Pages |
| Platform | NuxtHub Core |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Document Processing | Custom DOCX parser (fflate + fast-xml-parser) |
| Template Rendering | Handlebars |
| Authentication | nuxt-auth-utils + Firebase OAuth |

## Project Structure

```
app/
├── pages/           # Application pages
├── components/      # Vue components
├── layouts/         # Page layouts
├── middleware/      # Client-side route guards
└── composables/     # Vue composables

server/
├── api/             # API endpoints
├── db/              # Database schema, migrations, seed
├── middleware/      # Server middleware (auth)
├── plugins/         # Nitro plugins (auto-seed)
├── utils/           # Server utilities
└── queue/           # Cloudflare Queue handlers

doc/                 # Technical documentation
tests/               # Unit and E2E tests
```

## Key Features

### Authentication
- Email/password authentication
- OAuth providers via Firebase (Google, Microsoft, Apple, Facebook)
- Role-based access control (ADMIN, LAWYER, STAFF, ADVISOR, CLIENT)

### Document System
- DOCX template upload with automatic variable extraction
- Handlebars-based template rendering
- Document generation with variable substitution
- R2 blob storage for DOCX files

### Journey Workflows
- Multi-step client journeys
- Action items with various types (signature, upload, payment, etc.)
- Progress tracking and milestone management

### Development Features
- **Auto-seeding**: Empty databases automatically seed on first request
- **Real DOCX content**: Seed data includes actual parsed DOCX templates
- **Comprehensive test data**: 8 users, 3 matters, journeys, documents, relationships

## Database Management

### Schema Changes
1. Modify `server/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Migrations auto-apply on dev server restart

### Seeding

**Local Development:**
- **Automatic**: Dev server seeds empty database on first request
- **Manual**: `pnpm db:seed` or POST to `/api/_dev/seed`
- **Reset**: Delete `.wrangler/state/` and restart dev server

**Preview/Production Environments:**

Remote seeding is protected by a secret token. First, set the token:
```bash
wrangler secret put NUXT_SEED_TOKEN --env preview
```

Then trigger seeding via API:
```bash
curl -X POST https://app-preview.businessandlegacy.com/api/seed-remote \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

The endpoint returns test credentials on success and refuses to seed if data already exists.

## Environment Variables

### Required for OAuth (optional feature)
```env
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Session Secret (auto-generated in dev)
```env
NUXT_SESSION_PASSWORD=your-32-char-secret
```

### Remote Seeding (preview/production)
```env
NUXT_SEED_TOKEN=your-secure-token
```

## Deployment

### Preview (stage branch)
```bash
git push origin stage
# Auto-deploys to app-preview.trustandlegacy.com
```

**First-time setup for preview:**
```bash
# Set required secrets
wrangler secret put NUXT_SESSION_PASSWORD --env preview
wrangler secret put NUXT_SEED_TOKEN --env preview

# After deployment, seed the database
curl -X POST https://app-preview.businessandlegacy.com/api/seed-remote \
  -H "Authorization: Bearer YOUR_SEED_TOKEN"
```

### Production (main branch)
```bash
git push origin main
# Auto-deploys to app.trustandlegacy.com
```

## Documentation

| Document | Description |
|----------|-------------|
| [CURRENT_STATUS.md](doc/CURRENT_STATUS.md) | Project status and recent changes |
| [CLAUDE.md](CLAUDE.md) | AI assistant guidelines |
| [API_AUDIT_REPORT.md](doc/API_AUDIT_REPORT.md) | API endpoint documentation |
| [entity-relationship-diagram.md](doc/entity-relationship-diagram.md) | Database schema |
| [docx-processing-architecture.md](doc/docx-processing-architecture.md) | Document processing |

## Brand Colors

- **Navy**: #0A2540
- **Burgundy/Accent**: #C41E3A

## License

Proprietary - Your Trusted Planner, LLC
