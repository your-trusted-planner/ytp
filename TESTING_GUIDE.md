# Complete Testing Guide - Client Portal Flow

## 🎯 Test Scenario: Lawyer → Client Document Flow

This guide walks through testing the complete workflow:
1. **Lawyer** adds a client
2. **Lawyer** sends a document for signing
3. **Client** logs in
4. **Client** signs the document
5. Both see updates in their dashboards

---

## ⚠️ Prerequisites

**This flow requires deployment to Cloudflare** because the database (D1) only works in production.

### Deploy First:
```bash
# Login to NuxtHub (opens browser)
npx nuxthub login

# Link project
npx nuxthub link

# Deploy
pnpm deploy
```

After deployment, you'll get a URL like: `https://your-project.pages.dev`

---

## 🔐 Test Credentials

The database auto-seeds with these accounts:

**Lawyer Account:**
- Email: `lawyer@yourtrustedplanner.com`
- Password: `password123`

**Test Client:**
- Email: `client@test.com`  
- Password: `password123`

---

## 📋 Complete Test Flow

### Part 1: Lawyer Adds a New Client

1. **Login as Lawyer**
   - Go to your deployed URL
   - Login with lawyer credentials above
   - You should see the Lawyer Dashboard with stats

2. **Navigate to Clients**
   - Click "Clients" in the sidebar
   - You should see the existing test client

3. **Add New Client**
   - Click "Add Client" button
   - Fill in the form:
     - First Name: `Sarah`
     - Last Name: `Johnson`
     - Email: `sarah@example.com`
     - Phone: `555-0102` (optional)
     - Password: `password123`
   - Click "Add Client"
   - Modal closes, new client appears in list

4. **Verify Client Added**
   - Sarah Johnson should appear in clients table
   - Status should be "ACTIVE"
   - Badge should be green

---

### Part 2: Lawyer Sends Document to Client

1. **Navigate to Templates**
   - Click "Templates" in sidebar
   - You should see "Simple Will" template (seeded)

2. **Create Document from Template** *(Note: This feature needs completing)*
   - Click "Use Template" on Simple Will
   - Select client: Sarah Johnson
   - Fill in template variables:
     - Full Name: `Sarah Johnson`
     - Address: `123 Main St, Anytown, USA`
   - Click "Send to Client"

3. **Verify Document Created**
   - Go to "Documents" in sidebar
   - New document should appear
   - Status: "SENT"
   - Client: Sarah Johnson

4. **Check Dashboard**
   - Go back to Dashboard
   - "Recent Activity" should show document sent
   - Stats should update

---

### Part 3: Client Logs In

1. **Logout** (if logged in as lawyer)
   - Click "Sign Out" button

2. **Login as New Client**
   - Email: `sarah@example.com`
   - Password: `password123`
   - You should see CLIENT Dashboard (different from lawyer)

3. **Verify Client Dashboard**
   - Should see personal stats:
     - Total Documents: 1
     - Pending: 1
     - Signed: 0
   - "Recent Documents" section shows the will
   - Status badge: "SENT" or "PENDING"

---

### Part 4: Client Signs Document

1. **Navigate to Documents**
   - Click "My Documents" in sidebar
   - See the Simple Will document

2. **View Document**
   - Click "View" on the document
   - Document opens with filled variables
   - Should see signature area at bottom

3. **Sign Document** *(Note: Signature component needs completing)*
   - Draw signature in canvas
   - Click "Sign Document"
   - Confirmation message appears
   - Status updates to "SIGNED"

4. **Verify on Client Dashboard**
   - Go back to Dashboard
   - Stats update:
     - Pending: 0
     - Signed: 1
   - Document badge changes to green "SIGNED"

---

### Part 5: Lawyer Sees Updates

1. **Logout and Login as Lawyer**
   - Logout from client account
   - Login with lawyer credentials

2. **Check Dashboard**
   - "Recent Activity" shows:
     - "Sarah Johnson signed Simple Will"
   - Stats may update based on activity

3. **Check Documents**
   - Go to "Documents"
   - Find Sarah's will
   - Status: "SIGNED" (green badge)
   - "Signed At" timestamp shown

4. **Check Client Detail** *(if detail page created)*
   - Go to "Clients"
   - Click "View Details" on Sarah
   - See list of her documents
   - See signature status

---

## ✅ Expected Results Summary

| Step | What You Should See |
|------|---------------------|
| Lawyer adds client | Client appears in list immediately |
| Lawyer sends document | Document shows "SENT" status |
| Client logs in | Sees 1 pending document on dashboard |
| Client views document | Document renders with filled variables |
| Client signs | Status changes to "SIGNED", green badge |
| Lawyer checks | Sees signed status and activity log |

---

## 🐛 What to Test For

### Functionality Checks:
- ✅ Login/logout works for both roles
- ✅ Dashboards show different views (lawyer vs client)
- ✅ Stats update in real-time
- ✅ Documents appear in both views
- ✅ Status badges reflect current state
- ✅ Navigation works correctly
- ✅ Data persists across sessions

### UI/UX Checks:
- ✅ Design matches original Next.js version
- ✅ Navy/burgundy colors used consistently
- ✅ All buttons/forms work properly
- ✅ Loading states show correctly
- ✅ Error messages display if something fails
- ✅ Mobile responsive (test on phone)

---

## 🔍 Additional Test Scenarios

### Test Appointments Flow:
1. Lawyer schedules appointment for Sarah
2. Sarah sees it on her dashboard
3. Both see it in "Appointments" section

### Test Profile Updates:
1. Client updates their phone number
2. Changes save successfully
3. Lawyer can see updated info

### Test Password Change:
1. Go to Profile
2. Change password
3. Logout
4. Login with new password

---

## 📝 Features Still Needing Implementation

These were identified during testing prep:

1. **Document Signing Component**
   - Signature canvas (react-signature-canvas equivalent for Vue)
   - Save signature to document
   - Update status to SIGNED

2. **Document Creation from Template**
   - Modal to select template
   - Form to fill variables
   - Generate document with filled content
   - Send to client

3. **Client Detail Page**
   - `/dashboard/clients/[id]` page
   - Show all client documents
   - Show all appointments
   - Show notes

4. **Document Detail Page**
   - `/dashboard/documents/[id]` page
   - View full document
   - Sign if client
   - Mark complete if lawyer

---

## 🚀 How to Run Tests

1. **Deploy to Cloudflare**
   ```bash
   pnpm deploy
   ```

2. **Get your URL**
   - Note the deployment URL from console
   - e.g., `https://ytp-portal-abc123.pages.dev`

3. **Open in Browser**
   - Visit the URL
   - Start testing!

4. **Use DevTools**
   - Open browser console to see any errors
   - Check Network tab for API calls
   - Verify responses are correct

---

## 📊 Test Results Template

Use this to track your testing:

```
Date: _______________
Tester: _____________
URL: ________________

[ ] Login as Lawyer - PASS / FAIL
[ ] Add New Client - PASS / FAIL
[ ] Send Document - PASS / FAIL
[ ] Login as Client - PASS / FAIL
[ ] View Document - PASS / FAIL
[ ] Sign Document - PASS / FAIL
[ ] Lawyer Sees Update - PASS / FAIL

Notes:
_______________________
_______________________
```

---

## 💡 Tips

- Clear browser cache if you see old data
- Use incognito mode to test multiple accounts
- Check console for errors
- Test on mobile too
- Try different browsers (Chrome, Safari, Firefox)

---

**Once deployed, everything should work smoothly!** The database will be automatically available and all the features we built will be functional.


