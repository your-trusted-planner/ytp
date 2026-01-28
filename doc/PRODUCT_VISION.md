# Product Vision: Estate Planning Practice Platform

## 1. Problem Statement

Estate planning attorneys today operate with fragmented, loosely integrated point solutions:

**Drafting Tools** (WealthCounsel, Eldraw)
- Strong document assembly capabilities
- Weak or nonexistent practice management
- Limited CRM functionality
- No administration support

**General Practice Management** (Clio, PracticePanther, MyCase)
- Designed for general law practice, not estate planning specifically
- Estate-specific workflows require workarounds
- Adding document drafting features, but they are generalized and rudimentary
- No trust/estate administration features

**Administration Tools** (Estateably, WealthTrax)
- Focused narrowly on post-death workflows
- Separate system from planning tools
- Data re-entry from planning phase
- Another subscription, another login

**The Result:**
- Constant context-switching between applications
- Manual data re-entry across systems
- No unified client record across the full lifecycle
- Integration "solutions" that are brittle and limited
- Higher costs from multiple subscriptions
- Fragmented client experience
- No comprehensive KPIs without custom data warehousing/data lake solutions to aggregate across systems

---

## 2. Solution Overview

A vertically integrated platform purpose-built for estate planning attorneys, covering the complete client lifecycle:

```
┌────────────────┐    ┌───────────────┐    ┌────────────────────┐
│  PLANNING   │  → │  EXECUTION  │  → │ ADMINISTRATION │
│             │    │             │    │                │
│ - Intake    │    │ - Drafting  │    │ - Probate      │
│ - Discovery │    │ - Review    │    │ - Trust Admin  │
│ - Design    │    │ - Signing   │    │ - Settlements  │
└────────────────┘    └───────────────┘    └────────────────────┘
```

**Core Thesis:** As an estate planning attorney with the ability to design custom software, we can build a fully integrated solution without the idiosyncrasies of loosely integrated point solutions. Domain expertise drives design decisions that generic tools cannot make.

**Single System of Record:** From first client call through final distribution to beneficiaries - one platform, one client record, no handoffs.

---

## 3. User Personas

### Internal Users

#### Primary: Solo Estate Planning Attorney
- Runs their own practice or small firm
- Handles planning, execution, and administration
- Needs efficiency - every minute matters
- Values standardized processes that ensure quality
- Wants to deliver a professional, consistent client experience

#### Secondary: Small Firm (2-5 Attorneys)
- Multiple attorneys sharing client base
- Need visibility into each other's matters
- Staff members (paralegals, assistants) with defined roles
- Collaboration on complex matters

#### Staff Roles
- **Paralegal:** Document preparation, client communication, administration tasks
- **Legal Assistant:** Scheduling, intake, client contact
- **Bookkeeper:** Invoicing, trust accounting, payments

#### Practice Administrator / Owner
- Responsible for overall practice performance and health
- Needs aggregate visibility across all matters, clients, and staff
- Focuses on KPIs: revenue, pipeline, capacity, client satisfaction
- May or may not be a practicing attorney
- Cares about trends, bottlenecks, and operational efficiency
- Needs to identify "stuck" journeys, overdue tasks, and at-risk matters
- Financial oversight: revenue tracking, collections, profitability

### External Users

#### Prospects
- Potential clients evaluating the firm
- Need information about services and process
- May interact with intake forms, scheduling
- Future: interactive content, quizzes, webinars

#### Clients
- Active and past clients of the firm
- Document access and delivery
- Communication with the firm
- Progress visibility on their matter
- Future: client portal with self-service capabilities

### Future: Public Engagement
- Educational content consumers
- Webinar attendees
- Quiz/assessment participants
- Lead generation through interactive content

<!-- TODO: Expand personas with specific pain points, goals, and "day in the life" scenarios -->

---

## 4. Capability Areas

### 4.1 CRM & Client Management

**Full Vision:**
- Client intake with smart forms
- Family/relationship mapping (spouses, children, beneficiaries)
- Referral source tracking and attribution
- Client communication history (calls, emails, meetings)
- Document delivery and client portal
- Net worth and asset tracking
- Life event triggers (marriage, birth, death, divorce)

**MVP Subset:**
- Client records with contact information
- Family member/people tracking
- Referral partner management
- Basic activity logging
- Notes system

**Future Roadmap:**
- Client portal with secure document access
- Automated intake forms
- Net worth tracking with asset categories
- Life event monitoring and alerts
- Public engagement tools (quizzes, webinars, educational content)

---

### 4.2 Practice Management

**Full Vision:**
- Matter management with estate-planning-specific workflows
- Task management with templates and automation
- Calendar integration (Google, Outlook, iCal)
- Deadline tracking with court rules integration
- Team assignment and workload visibility
- Time tracking (if billable hour model used)
- Conflict checking
- Comprehensive KPIs and analytics from unified data

**MVP Subset:**
- Matter records linked to clients
- Basic task tracking
- Activity/audit logging
- Role-based access control

**Future Roadmap:**
- Calendar integration
- Automated task generation from templates
- Deadline calculators for probate/administration
- Time tracking
- Conflict checking
- Practice analytics and KPI dashboards

---

### 4.3 Document Drafting & Assembly

**Full Vision:**
- Template library for estate planning documents
- Field substitution from client/matter data
- Conditional logic (if spouse exists, include X)
- Clause libraries with alternative provisions
- Version control and revision tracking
- Collaborative review and markup
- Multi-format output (PDF, Word)
- Built-in e-signature (enhanced)
- Remote online notarization (RON) integration

**MVP Subset:**
- Template management (upload, organize)
- Simple field substitution (merge fields)
- PDF generation
- Built-in e-signature workflow
- Document storage per matter

**Future Roadmap:**
- Conditional document assembly
- Clause libraries
- Side-by-side document comparison
- Collaborative review/redlining
- Remote online notary (RON) integration
- Enhanced e-signature workflows

---

### 4.4 Client Journeys

**Full Vision:**
- Standardized, repeatable client experience workflows
- Journey templates for different engagement types
- Step-by-step progression with dependencies
- Automated notifications and reminders
- Client-facing progress visibility
- Analytics on journey completion and bottlenecks

**MVP Subset:**
- Journey templates with defined steps
- Manual progression tracking
- Basic notifications
- Journey assignment to clients

**Future Roadmap:**
- Automated step advancement based on triggers
- Client-facing journey portal
- Journey analytics and optimization
- Branching journeys based on conditions

---

### 4.5 Estate & Trust Administration

**Full Vision:**

**Probate Administration:**
- Case tracking from death through final distribution
- Court deadline management with jurisdiction rules
- Inventory and appraisal tracking
- Creditor claim management
- Heir/beneficiary communication
- Distribution calculations and tracking
- Court filing preparation
- Fiduciary accounting and reports

**Trust Administration:**
- Ongoing trust management
- Distribution tracking and schedules
- Beneficiary communication
- Trust accounting and statements
- Amendment tracking
- Successor trustee transitions

**MVP Subset:**
- Administration matter type with relevant fields
- Basic deadline/task tracking
- Asset inventory list
- Beneficiary tracking
- Document storage for administration

**Future Roadmap:**
- Jurisdiction-specific deadline calculators
- Formal fiduciary accounting reports
- Creditor claim workflow
- Distribution calculation tools
- Court e-filing integration (jurisdiction dependent)

---

### 4.6 Invoicing & Payments

**Full Vision:**
- Flat fee and hourly billing support
- Invoice generation from matter data
- Payment processing (credit card, ACH)
- Payment plans and recurring billing
- Accounts receivable tracking
- Revenue reporting and analytics
- Integration with accounting software

**MVP Subset:**
- Basic invoice creation
- Track paid/unpaid status
- Payment link generation (Stripe or LawPay)
- Simple revenue tracking

**Future Roadmap:**
- Automated invoice generation
- Payment plans
- Recurring billing for administration matters
- QuickBooks/Xero integration
- Revenue analytics

---

### 4.7 Trust Accounting (IOLTA)

**Full Vision:**
- Compliant trust account management
- Client ledgers with full transaction history
- Three-way reconciliation
- Trust-to-operating transfers
- State bar compliance reporting
- Audit trail for all transactions
- Multi-account support

**MVP Subset:**
- *Deferred from MVP* - Trust accounting complexity and compliance risk warrant careful implementation

**Future Roadmap:**
- Client trust ledgers
- Transaction recording
- Basic reconciliation tools
- Compliance reports by jurisdiction

---

### 4.8 Communications (Telephony & Messaging)

**Full Vision:**
- Click-to-call from client record
- Inbound call routing and IVR
- Call recording with transcription
- Voicemail with transcription
- SMS messaging for reminders and updates
- Call logging with automatic activity creation
- Virtual phone numbers
- After-hours handling

**MVP Subset:**
- Manual call logging (date, duration, notes)
- Call records linked to client activity

**Future Roadmap:**
- Twilio integration for click-to-call
- SMS appointment reminders
- Voicemail transcription
- Inbound call handling
- Call recording (with consent)

---

## 5. Integration Points

### Current/Near-term
- **E-signature:** Built-in (implemented)
- **Cloud Storage:** Cloudflare R2 for documents
- **Email:** Resend for transactional email
- **Google Drive:** Export/sync (implemented)
- **OAuth:** Firebase Identity Platform

### Future Integrations
- **Payments:** Stripe, LawPay
- **Calendar:** Google Calendar, Outlook, iCal
- **Telephony:** Twilio (SIP trunking, SMS)
- **Accounting:** QuickBooks, Xero
- **Court E-filing:** Jurisdiction-specific (Tyler Technologies, etc.)
- **Banks:** Trust account feeds (Plaid or direct)
- **Remote Online Notary (RON):** Provider TBD

---

## 6. Technical Foundation

### Current Stack
- **Frontend:** Nuxt 4 / Vue 3 on NuxtHub
- **Backend:** Nitro (Nuxt server) on Cloudflare Workers
- **Database:** SQLite (Cloudflare D1)
- **Storage:** Cloudflare R2
- **ORM:** Drizzle
- **Auth:** Session-based with bcrypt password hashing + Firebase OAuth2

### Technical Priorities
- **Data Privacy & Security:** Maximize practical client data privacy and security throughout the platform. Legal client data is sensitive; design with privacy-first principles.
- **Edge-first Architecture:** Leverage Cloudflare's global network for performance
- **Simplicity:** Avoid over-engineering; build what's needed when it's needed

### Technical Constraints
- **Edge-first:** Cloudflare Workers environment (no Node.js filesystem, limited compute time)
- **SQLite:** Single-region database (D1), some SQL limitations
- **Serverless:** No persistent connections, cold starts

### Technical Opportunities
- **Global edge deployment:** Fast for users anywhere
- **Low operational overhead:** No servers to manage
- **Cost-effective scaling:** Pay-per-request model

---

## 7. Answered Questions

These questions have been resolved:

### Billing Model
**Answer:** Internal product - no external billing model at this time. Building for own practice use first ("eating my own dog food"). Commercial model to be determined if/when offering to other firms.

### Multi-tenancy Model
**Answer:** Current platform is single-tenant. Future approach: build a separate tenant management platform with CI/CD automations to deploy new tenants. Each tenant gets their own isolated deployment rather than shared multi-tenant architecture.

### Mobile Requirements
**Answer:** Responsive web is sufficient for MVP. Native apps will be needed eventually but cannot be scoped until the web platform reaches MVP.

### Offline Capability
**Answer:** Nice to have but not a priority. Not a significant win at the moment given the workflows.

### Data Migration
**Answer:** This is a real need with existing data in Lawmatics and WealthCounsel.

**Lawmatics:**
- Has a robust API with Postman collection documentation
- Feasible to build import tooling

**WealthCounsel:**
- Very limited data export functionality
- Can export XML file containing metadata about drafted estate plans
- This XML export could be valuable for importing client/plan structure

**Roadmap:** Data migration tooling needed, prioritized by where the pain is greatest.

---

## 8. Open Questions

<!-- Capture decisions that still need to be made -->

1. **Jurisdiction scope for MVP?** Start with one state (Wyoming?) or jurisdiction-agnostic?

2. **Which data migration first?** Lawmatics (better API) or WealthCounsel (more critical data)?

3. **RON provider selection?** Which remote online notary service to integrate with?

---

## 9. Success Metrics

<!-- Define how we know this is working -->

**For MVP:**
- [ ] Platform is used daily for real client work
- [ ] Replaces at least one existing point solution
- [ ] Time savings vs. current workflow (qualitative)

**For Growth:**
- [ ] Additional attorneys onboarded
- [ ] Client satisfaction scores
- [ ] Matter cycle time reduction
- [ ] Revenue per matter visibility
- [ ] Comprehensive practice KPIs from unified data

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-23 | Initial | Created vision document from product discussion |
| 2025-01-23 | Update | Added personas (prospects, clients, public), fixed Estateably spelling, added KPI/data warehouse problem, updated tech stack to Nuxt 4/NuxtHub, added Firebase OAuth, added privacy priority, resolved billing/tenancy/mobile/offline/migration questions, removed external e-sign in favor of RON, added practice management drafting note |
| 2025-01-23 | Update | Added Practice Administrator/Owner persona for aggregate visibility and KPI focus |
