# Test Credentials for Local Testing

## 🔐 Login Credentials

### **Lawyer Account**
- **Email:** `lawyer@yourtrustedplanner.com`
- **Password:** `password123`
- **Role:** LAWYER
- **Access:** Full dashboard, all features

### **Client Account**  
- **Email:** `client@test.com`
- **Password:** `password123`
- **Role:** CLIENT
- **Access:** Client dashboard, documents, appointments

---

## 🌐 Local URLs

**Login Page:** http://localhost:3003/login

**Direct Dashboard:** http://localhost:3003/dashboard (redirects to login if not authenticated)

---

## 🧪 What You Can Test

### As Lawyer:
1. Login with lawyer credentials
2. View Dashboard (stats, activity)
3. **Navigate to Matters** - NEW! See 3 sample matters
4. Add new matter
5. Edit existing matters
6. View Clients
7. View Templates
8. View Documents
9. View Appointments

### As Client:
1. Login with client credentials
2. View Client Dashboard
3. See documents
4. See appointments
5. Update profile

---

## 🔧 Troubleshooting

If login fails:
1. Make sure server is running (check http://localhost:3003)
2. Check browser console for errors (F12)
3. Try hard refresh (Cmd+Shift+R)
4. Check that port 3003 is the active port (shown in terminal)

---

## 📊 Mock Data Includes

- 2 users (lawyer + client)
- 3 matters:
  - Wyoming Asset Protection Trust ($18,500)
  - Annual Trust Maintenance ($500/year)
  - LLC Formation ($2,500)
- 2 templates
- 1 sample questionnaire

All of this data works WITHOUT needing Cloudflare deployment!


