# Client Feedback Analysis - Meuli Law Demo Call

## 📋 Extracted Requirements & Feedback

### 🔥 CRITICAL FEATURES (MVP - Must Have)

#### 1. **Matters/Products System** (Lines 134-165)
**Priority:** HIGHEST
**Details:**
- Create "Matters" as central schema object (Owen: line 134)
- Matters drive client engagement, revenue, and service delivery
- Two types of matters:
  - **Single Matter** (one-time service, e.g., trust formation)
  - **Recurring Matter** (ongoing service, e.g., annual maintenance)
- Each matter has:
  - Name/Title
  - Price
  - Duration (for recurring: monthly/annually)
  - Associated engagement letter
  - Associated workflow
  - Description
- Lawyer can create inventory of matters (add products)
- All documents must be attached to a matter
- Revenue tracking per matter
- Client view shows engaged matters/services history

**Quote:** "Matter is kind of another name for product... that drives every document has to be attached to a matter" (Chris, line 164)

#### 2. **Scheduling System with Pre-Consultation Form** (Lines 95-96, 4:56-5:51)
**Priority:** HIGH
**Details:**
- Replace Calendly integration
- 9-10 question pre-consultation questionnaire BEFORE booking
- Google Calendar integration (not Calendly)
- Flow: Click time → Answer questions → Pay $375 via LawPay → Lock appointment
- Build sequence builder for custom question forms
- Questions saved and associated with appointment

**Quote:** "I go to the page, it opens up Matt's available or the lawyer's available times. I click a time. It asks me nine or 10 questions... then it takes my credit card with LawPay for $375" (Chris, lines 95-98)

#### 3. **LawPay Integration** (Lines 98, 24:11)
**Priority:** HIGH
**Details:**
- Integrate for consultation fees ($375)
- Integrate for engagement letter payments (e.g., $18,500)
- Support credit card AND ACH
- Payment triggers client conversion (lead → client)
- Half up front, half when documents complete (Matt, line 370-371)

#### 4. **Engagement Letter Automation** (Lines 98-110)
**Priority:** HIGH
**Details:**
- After consultation, auto-send engagement letter
- Pre-populated with specifics from appointment
- AI note-taker analyzes consultation
- Picks correct engagement letter sections based on service tier
- E-signature enabled
- Payment collection via LawPay
- Signing + payment = official client status

**Quote:** "the note taker is going to go, Oh, okay. And it's going to create the engagement letter in a way that could be E signed" (Chris, line 98)

#### 5. **PandaDoc API Integration for Notarization** (Lines 251-333)
**Priority:** HIGH
**Details:**
- Some documents require notary (trust certificates, etc.)
- Add checkbox on template: "Requires Notary"
- If checked, integrates with PandaDoc mobile notary API
- Workflow:
  1. Create notarization request
  2. Client selects available notary times (filtered by zip code)
  3. Notary previews document and accepts/denies
  4. Appointment booked
  5. Notarization happens (live video)
  6. Document marked as notarized and signed
- Track status: sent → waiting_for_notary → accepted → live → completed
- Consider in-house notary option (if Wyoming allows)

**Quote:** "just have an electronic signature won't work on that though with the panda doc API" (Matt, line 251)

#### 6. **Template Upload Functionality** (Lines 49-62)
**Priority:** MEDIUM-HIGH
**Details:**
- Current: Can create templates with text
- Needed: Upload .docx files as templates
- Must preserve {{curlyBraces}} variables in uploaded docs
- Can upload 1,000+ templates
- Bulk upload capability

**Quote:** "there's going to be an upload template option. So as long as you have these little... curly braces" (Danny, lines 49-51)

---

### 🎯 IMPORTANT FEATURES (Post-MVP)

#### 7. **Lead vs Client Distinction** (Lines 101-110)
**Priority:** MEDIUM
**Details:**
- People who book consultation but don't sign engagement = LEADS (not clients)
- Leads stored in CRM with:
  - Net worth from questionnaire
  - Timeline
  - Consultation notes
  - Nurture campaign status
- Leads don't get portal access
- Only clients (signed engagement + paid) get portal
- Add "LEAD" to user roles

#### 8. **Wyoming LLC Attorney API Integration** (Lines 158-164, 24:21)
**Priority:** MEDIUM
**Details:**
- Quick actions widget on dashboard
- Show client's entities from Wyoming LLC Attorney
- Display compliance status for annual fees
- Provides one-stop shop for entity management
- Shows number of LLCs held
- Integration endpoint to pull entity data

**Quote:** "we would tie in the API from Wyoming LLC attorney, and then redisplay that data the way we want" (Chris, line 194)

#### 9. **Client Notes System** (Line 47)
**Priority:** MEDIUM
**Details:**
- Already mentioned in demo
- Ability to add notes to client profile
- Notes visible in client detail view

#### 10. **Document Template Variables System** (Lines 80-82)
**Priority:** MEDIUM
**Details:**
- Documents have fillable variables ({{trustPurpose}}, etc.)
- Client fills in variables before signing
- Example shown: "trust purpose: to convert pennies to dollars"
- Variables saved with document

---

### 🚀 FUTURE ENHANCEMENTS (Nice to Have)

#### 11. **God Mode / Multi-Firm Admin** (Lines 35:35-38:09)
**Priority:** LOW (future)
**Details:**
- Admin view above lawyer view
- Ability to add multiple law firms
- Each firm has own dashboard
- Each firm has own inventory of matters/products
- Some products cross-pollinate between firms
- Admin sees all clients across all firms
- White-label capability

#### 12. **QuickBooks Integration** (Lines 353-359)
**Priority:** LOW
**Details:**
- Profit/loss statements in portal
- Invoice creation
- Export to QuickBooks certified CSV
- Automated invoicing tool

#### 13. **Conflict Check Agent** (Lines 164-183)
**Priority:** LOW (roadmap)
**Details:**
- AI agent that checks for conflicts
- Searches for name variations (Daniel/Danny/DD)
- Flags potential conflicts (95% accuracy)
- Human review required before clearing
- Prevents becoming client until conflict check passed

---

## 🎨 UI/UX NOTES

- ✅ Clean, simple design (Chris approved)
- ✅ Responsive (Chris noted)
- ✅ "Looks good" - client approved first impression
- Keep it lean and tight (Chris, line 47:51)

---

## 🔄 CLIENT FLOW (As Understood)

### Lead → Client Journey:
1. **Lead Stage:**
   - Visitor schedules consultation
   - Answers 9-10 questions
   - Pays $375 via LawPay
   - Has 30-min consultation
   - **Status: LEAD**

2. **Conversion to Client:**
   - Post-consultation, receives engagement letter
   - Engagement letter auto-populated from consultation
   - Signs engagement letter
   - Pays engagement fee (e.g., $18,500) via LawPay
   - **Status: CLIENT** (gets portal access)

3. **Client Experience:**
   - Receives documents to sign
   - Can fill in template variables
   - Signs documents (e-sign or notary via PandaDoc)
   - Views all signed documents
   - Schedules additional appointments
   - Sees services/matters engaged

---

## ⚙️ TECHNICAL INTEGRATIONS NEEDED

1. **Google Calendar** - Replace Calendly
2. **LawPay** - Payment processing
3. **PandaDoc API** - Mobile notarization
4. **AI Note-taker** - Consultation analysis for engagement letters
5. **Wyoming LLC Attorney API** - Entity data (future)
6. **QuickBooks** - Financial reporting (future)

---

## 📊 PRIORITY RANKING

| Priority | Feature | Timeline |
|----------|---------|----------|
| 1 | Matters/Products System | This iteration |
| 2 | Scheduling + Pre-Consultation Form | This iteration |
| 3 | LawPay Integration | This iteration |
| 4 | Engagement Letter Automation | This iteration |
| 5 | PandaDoc Notary Integration | This iteration |
| 6 | Template Upload (.docx) | This iteration |
| 7 | Lead vs Client CRM | Next iteration |
| 8 | Wyoming LLC API | Future |
| 9 | God Mode / Multi-Firm | Future |
| 10 | QuickBooks Integration | Future |

---

## 🤔 CLARIFICATIONS NEEDED

1. **Engagement Letter Templates:**
   - Do you have engagement letter templates ready?
   - What are the different tiers/options (mentioned 3 options between $15k-$18.5k)?
   - What consultation data should auto-populate them?

2. **Pre-Consultation Questions:**
   - What are the exact 9-10 questions?
   - Are they different per service type?

3. **LawPay Credentials:**
   - Do you have a LawPay account?
   - API credentials ready?

4. **Document Notarization:**
   - Which specific documents require notary?
   - Wyoming notary rules for remote notarization?

5. **Payment Split:**
   - Confirmation: Half upfront, half when docs complete?
   - Is this for all matters or specific ones?

---

## ✅ NEXT STEPS

1. Implement Matters/Products system
2. Build scheduling with questionnaire
3. Integrate LawPay
4. Add engagement letter workflow
5. Integrate PandaDoc API
6. Add template upload feature
7. Test complete lead → client flow




