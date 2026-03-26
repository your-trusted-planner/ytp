# How We Handle Your Form Data

*Last updated: March 25, 2026*

When you fill out a form through our client portal, booking page, or a link we send you, your information is handled with the same care and confidentiality we bring to every aspect of our legal practice. This document explains exactly what happens with your data at each step.

---

## Where Your Information Is Stored

All form data is stored securely on our platform, which runs on Cloudflare's global infrastructure. Specifically:

- **Your responses** are stored in an encrypted database hosted by Cloudflare (Cloudflare D1), a service that meets SOC 2 Type II compliance standards.
- **Data in transit** is always encrypted using TLS (the same encryption used by banks and financial institutions).
- **Data at rest** is encrypted on Cloudflare's servers. We do not store your information on local office computers or personal devices.

Your data never passes through third-party form services, marketing platforms, or analytics tools. It goes directly from your browser to our secure servers.

---

## How Draft Saving Works

If you're filling out a longer form — like our Life & Legacy Planning Session Inventory — your progress is saved automatically so you don't lose your work if you need to step away.

### When You're Logged In to Your Client Portal

- Your in-progress responses are saved securely to our database as a **draft**.
- Drafts are tied to your user account, so only you (and our authorized staff) can see them.
- Your progress is saved automatically every 30 seconds and whenever you move between form sections.
- When you return to the form — even from a different device — your previous answers will be right where you left off.
- Once you submit the form, the draft is finalized and becomes part of your permanent client record.

### When You're Filling Out a Public Form (No Login Required)

- Your in-progress responses are saved **locally in your web browser** using a technology called localStorage.
- This data stays on your device only. It is **not** sent to our servers until you click Submit.
- If you close the browser tab and return later (on the same device and browser), your progress will be restored.
- Local drafts automatically expire after 7 days for your protection.
- If you use a different device, browser, or clear your browser data, the draft will not be available — you would need to start over.
- Once you click Submit, your responses are transmitted securely to our servers and the local copy is cleared.

---

## Who Can Access Your Form Responses

- **You** can see your own submitted and in-progress forms through the client portal.
- **Your attorney and authorized staff** can view your responses to prepare for meetings, draft documents, and provide you with better service. This access is governed by our professional obligations under the Rules of Professional Conduct.
- **No one else** has access to your form data. We do not share, sell, or provide your responses to any third party.

All access to client data within our system is logged for accountability.

---

## What Information We Collect

Our forms collect only the information relevant to the legal services we're providing. Depending on the form, this may include:

- **Contact information** — name, email, phone number, mailing address
- **Personal details** — date of birth, marital status, family information
- **Financial information** — approximate asset values, property details, account types (we do not collect full account numbers through forms)
- **Legal planning preferences** — goals, priorities, existing documents

Each form clearly labels which fields are required and which are optional. You are never required to provide more information than is necessary for the purpose described.

---

## How Long We Keep Your Data

- **Submitted form responses** are retained as part of your client file for the duration of our professional relationship and in accordance with our document retention policy and applicable bar rules.
- **Draft responses** that are never submitted are retained on our servers for a reasonable period to allow you to complete them, then automatically cleaned up.
- **Local browser drafts** expire after 7 days and are cleared automatically.

---

## Your Rights

You have the right to:

- **Access** your submitted form responses at any time through the client portal
- **Request corrections** to any information you've provided
- **Ask questions** about how your data is handled — contact our office at any time

---

## Technical Summary

For those who want the technical details:

| Aspect | Detail |
|--------|--------|
| **Hosting** | Cloudflare Workers + D1 (US-based edge infrastructure) |
| **Encryption in transit** | TLS 1.3 |
| **Encryption at rest** | Cloudflare-managed encryption |
| **Authentication** | Encrypted HTTP-only session cookies (portal); no authentication required for public forms |
| **Draft storage (authenticated)** | Server-side database with user-scoped access control |
| **Draft storage (public)** | Browser localStorage (device-local, never transmitted until submission) |
| **Draft auto-save frequency** | On section navigation + every 30 seconds of inactivity |
| **Draft expiration (local)** | 7 days |
| **Access logging** | All data access is recorded in our activity log |
| **Third-party data sharing** | None |

---

*If you have any questions about how we handle your information, please contact our office. We're happy to walk you through any aspect of our data practices.*
