DEPLOYMENT SEED DATA CONFIRMATION
==================================

AUTOMATIC DATABASE SEEDING ON DEPLOYMENT
-----------------------------------------

When you deploy to NuxtHub/Cloudflare, the database will AUTOMATICALLY seed with all test data.

How it Works:
-------------

1. On first deployment, the database plugin runs automatically
2. Checks if users table exists
3. If not, runs migrations (creates all 13 tables)
4. Then runs the seed script
5. All sample data loads automatically


What Gets Seeded:
-----------------

USER ACCOUNTS:
- Lawyer: lawyer@yourtrustedplanner.com / password123
  - Role: LAWYER
  - Name: John Meuli
  
- Client: client@test.com / password123
  - Role: CLIENT
  - Name: Jane Doe
  - Assigned to lawyer John Meuli

MATTERS (Service Offerings):
- Wyoming Asset Protection Trust ($18,500) - SINGLE
- Annual Trust Maintenance ($500/year) - RECURRING/ANNUALLY
- LLC Formation - Wyoming ($2,500) - SINGLE

DOCUMENT TEMPLATES:
- Simple Will (basic will template)
- Engagement Agreement - WAPA (engagement letter)

FOLDERS:
- Estate Planning (template folder)

SAMPLE DOCUMENT FOR TESTING:
- Title: "Trust Purpose Questionnaire"
- Assigned to: Jane Doe (client)
- Status: SENT (ready to be viewed and signed)
- Content: Has {{variables}} for client to fill
- Matter: Linked to Wyoming Asset Protection Trust

QUESTIONNAIRE:
- Initial Consultation Questionnaire (5 sample questions)


Complete Client Journey Available Immediately:
-----------------------------------------------

After deployment, you can immediately test:

1. Login as client (client@test.com)
2. See 1 document in dashboard
3. Click "View" to open document
4. Fill in required variables
5. Draw and sign signature
6. Document updates to SIGNED
7. Both lawyer and client see the signed document


Seed Script Location:
---------------------
server/database/seed.ts

Database Plugin:
----------------
server/plugins/database.ts
- Automatically runs on first server start
- Checks if database needs initialization
- Runs migrations
- Runs seed data
- Only runs once (won't duplicate data)


Verification After Deployment:
------------------------------

To confirm seeding worked:

1. Deploy to NuxtHub
2. Open your deployment URL
3. Login with test credentials
4. Should see:
   - 1 client in lawyer view
   - 3 matters in Matters page
   - 2 templates in Templates page
   - 1 document in client view

If seeding didn't run (rare), you can manually trigger:
POST /api/test/seed


IMPORTANT:
----------

The seed data is in the codebase and will deploy with it.
No additional configuration needed.
Just deploy and it works!


Files in GitHub That Handle Seeding:
------------------------------------

✓ server/database/seed.ts - All seed data
✓ server/database/schema.ts - Complete database schema (13 tables)
✓ server/database/migrations/*.sql - Migration files
✓ server/plugins/database.ts - Auto-initialization plugin
✓ server/api/test/seed.post.ts - Manual seed endpoint (backup)


DEPLOYMENT COMMAND:
-------------------

npx nuxthub login
npx nuxthub link
pnpm deploy

Database will seed automatically on first run!

