# Your Trusted Planner - Client Portal (Nuxt 3 + NuxtHub)

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

### Database Not Available Locally
The app uses **Cloudflare D1** (edge SQLite database) which requires deployment to Cloudflare to function. 

In local development:
- ✅ All pages load correctly
- ✅ UI components work
- ❌ API calls will fail (no database)
- ❌ Login won't work (requires database)

### To Test With Full Database:
Deploy to Cloudflare using NuxtHub - database will be automatically available.

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

- **Framework:** Nuxt 3
- **Database:** Cloudflare D1 (SQLite at edge)
- **Storage:** Cloudflare R2 (for files)
- **Hosting:** Cloudflare Pages + Workers
- **Platform:** NuxtHub
- **ORM:** Drizzle
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## 📁 Key Directories

- `/pages/` - Application pages (login, dashboard, etc.)
- `/components/` - Vue components
- `/server/api/` - API endpoints
- `/server/database/` - Database schema & migrations
- `/layouts/` - Page layouts
- `/middleware/` - Route guards

## 🎨 Brand Colors

- **Navy:** #0A2540
- **Burgundy/Accent:** #C41E3A

## 📝 Next Steps

See `REBUILD_PROGRESS.md` for detailed status and remaining work.
