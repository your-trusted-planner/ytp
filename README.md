# Your Trusted Planner - Client Portal (Nuxt 4 + NuxtHub)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Visit **http://localhost:3000** (or the port shown in terminal)

## 🔐 Login Page

The login page is fully functional at `/login` with identical design to the original Next.js version:
- Navy blue background (#0A2540)
- Burgundy CTA button (#C41E3A)
- YTP logo
- Clean, professional layout

## ⚠️ Important Notes

### Local Development Fully Functional
The app uses **NuxtHub Core** which provides local development support for Cloudflare services (D1, R2, KV) via Miniflare.

In local development:
- ✅ All pages load correctly
- ✅ UI components work
- ✅ Database works locally (SQLite via Miniflare)
- ✅ Login and authentication work
- ✅ File uploads to R2 work locally
- ✅ Full feature parity with production

Run migrations locally with: `pnpm db:migrate`

## 📦 What's Been Rebuilt

- ✅ Complete authentication system
- ✅ Login page (identical design)
- ✅ Dashboard layout with sidebar
- ✅ Lawyer & client dashboards
- ✅ All UI components in Vue 3
- ✅ API routes for stats, documents, appointments
- ✅ Database schema (9 tables) 
- ✅ Tailwind styling (brand colors)

## 🔧 Tech Stack

- **Framework:** Nuxt 4
- **Database:** Cloudflare D1 (SQLite at edge)
- **Storage:** Cloudflare R2 (for files)
- **Hosting:** Cloudflare Pages + Workers
- **Platform:** NuxtHub Core (local dev + deployment)
- **ORM:** Drizzle
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Document Processing:** Custom DOCX parser (fflate + fast-xml-parser) for Cloudflare Workers compatibility

## 📁 Key Directories

- `app/pages/` - Application pages (login, dashboard, etc.)
- `app/components/` - Vue components
- `app/layouts/` - Page layouts
- `server/api/` - API endpoints
- `server/database/` - Database schema & migrations
- `server/middleware/` - Route guards
- `doc/` - Technical documentation

## 🎨 Brand Colors

- **Navy:** #0A2540
- **Burgundy/Accent:** #C41E3A

## 📚 Documentation

- **COMPLETE_IMPLEMENTATION_SUMMARY.md** - Comprehensive project overview
- **FINAL_STATUS_COMPLETE.md** - Current implementation status
- **doc/DOCUMENTATION_CLEANUP_ANALYSIS.md** - Documentation organization guide
- **CLOUDFLARE_SETUP.md** - Deployment instructions
- **doc/wydapt-seeding-production.md** - WYDAPT document seeding guide
- **doc/docx-processing-architecture.md** - Custom DOCX parser implementation
