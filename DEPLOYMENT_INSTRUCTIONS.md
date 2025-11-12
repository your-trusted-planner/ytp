# 🚀 Deployment Instructions - Nuxt Portal to Cloudflare

## Quick Start

The fastest way to deploy and test your rebuilt portal:

```bash
cd /Users/dannydemichele/YourTrustedPlanner.com/nuxt-portal

# 1. Login to NuxtHub (opens browser - do this manually)
npx nuxthub login

# 2. Link this project to NuxtHub
npx nuxthub link

# 3. Deploy!
pnpm deploy
```

That's it! Your app will be live on Cloudflare with a URL like:
`https://ytp-portal-xxx.pages.dev`

---

## Detailed Step-by-Step

### Step 1: Create NuxtHub Account

1. Go to [hub.nuxt.com](https://hub.nuxt.com)
2. Click "Sign in with GitHub"
3. Authorize NuxtHub

### Step 2: Login via CLI

```bash
npx nuxthub login
```

This will:
- Open your browser
- Ask you to authorize
- Save credentials locally

### Step 3: Link Project

```bash
npx nuxthub link
```

You'll be asked:
- Project name: `ytp-client-portal` (or your choice)
- Select team/account
- Confirm settings

### Step 4: Deploy

```bash
pnpm deploy
```

This will:
- Build your Nuxt app
- Create Cloudflare D1 database
- Set up R2 blob storage
- Set up KV for sessions
- Deploy to Cloudflare Pages
- Run database migrations
- Seed with test data

**Deployment takes ~2-5 minutes**

---

## What Happens During Deployment

1. **Build Process**
   - Nuxt compiles your app
   - Vite bundles assets
   - TypeScript is transpiled

2. **Cloudflare Setup** (automatic via NuxtHub)
   - Creates Pages project
   - Creates D1 database
   - Creates R2 bucket
   - Creates KV namespace
   - Binds everything together

3. **Database Initialization**
   - Runs migration SQL
   - Creates 9 tables
   - Seeds test data:
     - Lawyer account
     - Client account
     - Sample template

4. **Goes Live**
   - Gets cloudflare.pages.dev URL
   - SSL certificate auto-generated
   - CDN caching enabled
   - Edge functions deployed globally

---

## After Deployment

### 1. Test Login

Visit your deployment URL and login with:

**Lawyer:**
- Email: `lawyer@yourtrustedplanner.com`
- Password: `password123`

**Client:**
- Email: `client@test.com`
- Password: `password123`

### 2. Check Database

```bash
# View database in NuxtHub admin
npx nuxthub open
```

This opens the NuxtHub dashboard where you can:
- View database tables
- Run SQL queries
- See environment variables
- Check deployment logs
- Monitor usage

### 3. Set Environment Variables (if needed)

```bash
# Add environment variable via CLI
npx nuxthub env set JWT_SECRET your-secret-key-here

# Or via the web dashboard
npx nuxthub open
# Go to Settings > Environment Variables
```

---

## Custom Domain Setup

Want to use your own domain? (e.g., `portal.yourtrustedplanner.com`)

1. **In NuxtHub Dashboard:**
   - Go to your project
   - Click "Domains"
   - Click "Add Domain"
   - Enter: `portal.yourtrustedplanner.com`

2. **In Your DNS Provider:**
   - Add CNAME record:
     - Name: `portal`
     - Value: `your-project.pages.dev`
   - Save changes

3. **Wait for DNS** (~5-60 minutes)

4. **SSL Auto-Generated** by Cloudflare

---

## GitHub Integration

For automatic deployments on every push:

### Option 1: Via NuxtHub Dashboard

1. Go to [hub.nuxt.com](https://hub.nuxt.com)
2. Select your project
3. Go to "Settings" > "Git"
4. Click "Connect to GitHub"
5. Select repository
6. Choose branch (main/master)

Now every push to that branch = auto deploy!

### Option 2: Via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm deploy
        env:
          NUXTHUB_TOKEN: ${{ secrets.NUXTHUB_TOKEN }}
```

Get your token from: `npx nuxthub whoami`

---

## Rollback Deployment

Made a mistake? Roll back easily:

```bash
# List recent deployments
npx nuxthub deployments

# Rollback to previous
npx nuxthub rollback

# Or rollback to specific deployment
npx nuxthub rollback abc123
```

---

## View Logs

```bash
# Real-time logs
npx nuxthub logs

# Last 100 lines
npx nuxthub logs --lines 100

# Follow logs (like tail -f)
npx nuxthub logs --follow
```

---

## Database Management

### View Tables

```bash
# Open database browser
npx nuxthub open
# Navigate to "Database" tab
```

### Run SQL Queries

In the NuxtHub dashboard > Database:

```sql
-- View all users
SELECT * FROM users;

-- View all clients
SELECT * FROM users WHERE role = 'CLIENT';

-- View all documents
SELECT * FROM documents;
```

### Backup Database

```bash
# Export database
npx nuxthub database export

# Import database
npx nuxthub database import backup.sql
```

---

## Monitoring & Analytics

### Built-in Metrics (Free)

NuxtHub dashboard shows:
- Request count
- Error rate
- Response times
- Database queries
- Storage usage

### Cloudflare Analytics

Go to Cloudflare dashboard:
- Page views
- Unique visitors
- Bandwidth
- Cache hit ratio
- Security events

---

## Troubleshooting

### Build Fails

```bash
# Check build logs
npx nuxthub logs --deployment latest

# Common fixes:
# 1. Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 2. Check for TypeScript errors
pnpm build

# 3. Check environment variables
npx nuxthub env list
```

### Database Not Working

```bash
# Check if database exists
npx nuxthub open
# Go to Resources > Database

# Re-run migrations
npx nuxthub database migrations apply

# Check database logs
npx nuxthub logs --filter database
```

### 404 Errors

- Clear Cloudflare cache
- Check routes in `.nuxt/routes.mjs`
- Verify middleware isn't blocking

---

## Cost Estimate

**Cloudflare Free Tier Includes:**
- Unlimited requests
- 100,000 D1 database reads/day
- 5GB D1 storage
- 10GB R2 storage
- 100,000 R2 requests/month

**For a small law firm (~100 clients):**
- Monthly cost: **$0** (stays in free tier)

**If you grow beyond free tier:**
- Pages: $0.15/million requests
- D1: $0.75/million reads
- R2: $0.015/GB storage

Even with 1000 active clients, expect **< $5/month**.

---

## Security Checklist

Before going live to real clients:

- [ ] Change JWT_SECRET environment variable
- [ ] Update default passwords (lawyer/client test accounts)
- [ ] Enable 2FA on Cloudflare account
- [ ] Set up WAF rules if needed
- [ ] Add rate limiting
- [ ] Set up monitoring alerts
- [ ] Review CORS settings
- [ ] Add security headers

---

## Next Steps After Deployment

1. **Test thoroughly** using `TESTING_GUIDE.md`
2. **Add your real clients** (delete test accounts)
3. **Upload actual document templates**
4. **Set up custom domain**
5. **Configure email notifications** (if needed)
6. **Add Google Analytics** (if desired)
7. **Train your team** on the new system

---

## Support & Resources

- **NuxtHub Docs:** https://hub.nuxt.com/docs
- **Nuxt Docs:** https://nuxt.com/docs
- **Cloudflare Docs:** https://developers.cloudflare.com

---

**You're ready to deploy!** 🚀

The command you need:
```bash
npx nuxthub login && npx nuxthub link && pnpm deploy
```


