# User Story Map: Estate Planning Practice Platform

This document maps user stories along the client lifecycle. Stories are organized by:
- **Backbone**: Major activities across the lifecycle (horizontal)
- **Walking Skeleton**: Minimum stories for end-to-end flow (first row under each activity)
- **Depth**: Additional stories adding capability (lower rows = lower priority)

---

## How to Read This Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           BACKBONE (Activities)                         │
├────────────┬────────────┬────────────┬─────────────┬────────────┬───────────────────────┤
│ Activity │ Activity │ Activity │ Activity │ Activity │ Activity          │
│    1     │    2     │    3     │    4     │    5     │    6              │
├────────────┼────────────┼────────────┼─────────────┼────────────┼───────────────────────┤
│ Story A  │ Story D  │ Story G  │ Story J  │ Story M  │ Story P  ← MVP    │
├────────────┼────────────┼────────────┼─────────────┼────────────┼───────────────────────┤
│ Story B  │ Story E  │ Story H  │ Story K  │ Story N  │ Story Q  ← v1.1   │
├────────────┼────────────┼────────────┼─────────────┼────────────┼───────────────────────┤
│ Story C  │ Story F  │ Story I  │ Story L  │ Story O  │ Story R  ← Future │
└────────────┴────────────┴────────────┴────────────┴─────────────┴───────────────────────┘
```

**Legend:**
- 🟢 Implemented (or mostly implemented)
- 🟡 Partially implemented
- ⚪ Not started
- 🎯 MVP candidate
- 📋 Backlog

---

## Persona: Attorney

### Backbone: Client Lifecycle

```
┌───────────────┬──────────────┬───────────────┬──────────────┬───────────────┬───────────────┬──────────────┐
│  ATTRACT   │  INTAKE    │  DISCOVER  │   DRAFT    │  EXECUTE   │  MAINTAIN  │ ADMINISTER │
│            │            │            │            │            │            │            │
│ Get new    │ Capture    │ Gather     │ Create     │ Sign &     │ Updates &  │ Probate &  │
│ prospects  │ prospect   │ client     │ documents  │ finalize   │ reviews    │ trust admin│
└───────────────┴──────────────┴───────────────┴──────────────┴───────────────┴───────────────┴──────────────┘
```

---

### Activity 1: ATTRACT (Marketing & Lead Generation)

| Priority | Story | Status |
|----------|-------|--------|
| Future | As an attorney, I want to publish educational content so that prospects find me | 📋 |
| Future | As an attorney, I want to host webinars so that I can educate and attract prospects | 📋 |
| Future | As an attorney, I want prospects to take a quiz so that I can qualify leads | 📋 |
| Future | As an attorney, I want to track marketing attribution so that I know what's working | 📋 |

**Notes:** Marketing/attraction features are future state. Current assumption is leads come from existing channels (referrals, website, etc.)

---

### Activity 2: INTAKE (Prospect to Client)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to create a new client record so that I can track their information | 🟢 |
| MVP | As an attorney, I want to record how a client was referred so that I can track referral sources | 🟢 |
| MVP | As an attorney, I want to add family members to a client so that I can track relationships | 🟢 |
| MVP | As an attorney, I want to create a new matter for a client so that I can track their engagement | 🟢 |
| MVP | As an attorney, I want to log a phone call with a prospect so that I have a record of our conversation | 🟡 |
| v1.1 | As an attorney, I want prospects to fill out an intake form online so that I don't have to do data entry | 📋 |
| v1.1 | As an attorney, I want to run a conflict check so that I can identify potential conflicts before engagement | 📋 |
| v1.1 | As an attorney, I want to send an engagement letter for e-signature so that I can formalize the relationship | 📋 |
| Future | As a prospect, I want to schedule a consultation online so that I don't have to call | 📋 |
| Future | As a prospect, I want to see my upcoming appointment details so that I'm prepared | 📋 |

---

### Activity 3: DISCOVER (Information Gathering)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to view a client's profile with all their information so that I understand their situation | 🟢 |
| MVP | As an attorney, I want to add notes to a client record so that I can document what I learn | 🟢 |
| MVP | As an attorney, I want to track a client's family members with relationships so that I understand their family structure | 🟢 |
| MVP | As an attorney, I want to see a client's existing estate planning documents so that I know what they have | 🟡 |
| v1.1 | As an attorney, I want to send a discovery questionnaire to the client so that they can provide information before our meeting | 📋 |
| v1.1 | As an attorney, I want to track a client's assets and net worth so that I can recommend appropriate planning | 📋 |
| v1.1 | As a client, I want to fill out a questionnaire about my family and assets so that my attorney has accurate information | 📋 |
| Future | As an attorney, I want the system to suggest planning strategies based on client profile so that I don't miss opportunities | 📋 |

---

### Activity 4: DRAFT (Document Creation)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to upload document templates so that I can use them for drafting | 🟢 |
| MVP | As an attorney, I want to generate a document from a template with client data merged in so that I don't have to manually fill in fields | 🟡 |
| MVP | As an attorney, I want to store generated documents in the client's matter so that everything is organized | 🟢 |
| MVP | As an attorney, I want to preview a document before finalizing so that I can review for errors | 🟡 |
| v1.1 | As an attorney, I want to define merge fields in templates so that the system knows what to substitute | 📋 |
| v1.1 | As an attorney, I want conditional sections in documents so that content varies based on client situation | 📋 |
| v1.1 | As an attorney, I want to compare two versions of a document so that I can see what changed | 📋 |
| Future | As an attorney, I want a clause library so that I can select alternative provisions | 📋 |
| Future | As an attorney, I want AI assistance in drafting so that I can work faster | 📋 |

---

### Activity 5: EXECUTE (Signing & Finalization)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to send a document for e-signature so that the client can sign remotely | 🟢 |
| MVP | As a client, I want to sign a document electronically so that I don't have to come to the office | 🟢 |
| MVP | As an attorney, I want to see the signature status of documents so that I know what's pending | 🟢 |
| MVP | As an attorney, I want to download signed documents so that I can provide copies | 🟢 |
| v1.1 | As an attorney, I want to send reminders for unsigned documents so that clients don't forget | 📋 |
| v1.1 | As an attorney, I want multiple signers on a document so that spouses can both sign | 🟡 |
| Future | As an attorney, I want to schedule a remote online notarization so that documents requiring notarization can be executed remotely | 📋 |
| Future | As an attorney, I want witness signatures on documents so that I can meet execution requirements | 📋 |

---

### Activity 6: MAINTAIN (Updates & Reviews)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to see all documents for a client so that I can review what they have | 🟢 |
| MVP | As an attorney, I want to add notes about a review meeting so that I have a record | 🟢 |
| v1.1 | As an attorney, I want to schedule periodic reviews so that clients come back regularly | 📋 |
| v1.1 | As an attorney, I want to be notified of client life events so that I can reach out about updates | 📋 |
| v1.1 | As an attorney, I want to track document versions over time so that I can see the history | 📋 |
| Future | As a client, I want to notify my attorney of a life change so that my documents can be updated | 📋 |
| Future | As an attorney, I want to compare current documents to client's current situation so that I can identify needed updates | 📋 |

---

### Activity 7: ADMINISTER (Probate & Trust Administration)

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to create an administration matter so that I can track post-death work | 🟡 |
| MVP | As an attorney, I want to record the decedent and their death date so that I have basic case information | 📋 |
| MVP | As an attorney, I want to track beneficiaries of an estate/trust so that I know who receives distributions | 📋 |
| MVP | As an attorney, I want to list assets in the estate/trust so that I can track the inventory | 📋 |
| v1.1 | As an attorney, I want deadline tracking for probate filings so that I don't miss court dates | 📋 |
| v1.1 | As an attorney, I want to track creditor claims so that I can manage the claims process | 📋 |
| v1.1 | As an attorney, I want to calculate and track distributions so that I can ensure proper allocation | 📋 |
| Future | As an attorney, I want to generate fiduciary accountings so that I can report to beneficiaries and court | 📋 |
| Future | As an attorney, I want jurisdiction-specific deadline calculators so that dates are automatically computed | 📋 |

---

## Persona: Attorney (Cross-Cutting Activities)

These activities span the entire lifecycle.

### Practice Management

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to see all my matters in one place so that I know what I'm working on | 🟢 |
| MVP | As an attorney, I want to see recent activity across the practice so that I know what's happening | 🟢 |
| MVP | As an attorney, I want to search for clients and matters so that I can find what I need quickly | 🟢 |
| MVP | As an attorney, I want to assign matters to staff so that work is distributed | 🟡 |
| v1.1 | As an attorney, I want to create tasks on matters so that I can track to-dos | 📋 |
| v1.1 | As an attorney, I want to see my calendar with appointments and deadlines so that I know my schedule | 📋 |
| v1.1 | As an attorney, I want to track time on matters so that I can bill accurately (if hourly) | 📋 |
| Future | As an attorney, I want a dashboard with KPIs so that I understand practice performance | 📋 |
| Future | As an attorney, I want reports on matter pipeline so that I can forecast work | 📋 |

---

### Billing & Payments

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to create an invoice for a matter so that I can bill the client | 📋 |
| MVP | As an attorney, I want to send an invoice to a client so that they can pay | 📋 |
| MVP | As an attorney, I want to record a payment received so that I can track what's paid | 📋 |
| MVP | As an attorney, I want to see outstanding invoices so that I can follow up on collections | 📋 |
| v1.1 | As a client, I want to pay an invoice online so that payment is convenient | 📋 |
| v1.1 | As an attorney, I want to set up a payment plan so that clients can pay over time | 📋 |
| Future | As an attorney, I want to manage trust account transactions so that I stay compliant | 📋 |
| Future | As an attorney, I want trust account reconciliation reports so that I can audit my accounts | 📋 |

---

### Communications

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to log a phone call with date, duration, and notes so that I have a record | 🟡 |
| MVP | As an attorney, I want to see all communications with a client in one place so that I have context | 🟡 |
| v1.1 | As an attorney, I want to send an email to a client from the system so that it's tracked | 📋 |
| v1.1 | As an attorney, I want to send SMS appointment reminders so that clients show up | 📋 |
| Future | As an attorney, I want click-to-call from a client record so that I can call without dialing | 📋 |
| Future | As an attorney, I want voicemail transcription so that I can read messages | 📋 |
| Future | As an attorney, I want call recording so that I have a record of conversations | 📋 |

---

### Client Journeys

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to define journey templates with steps so that I can standardize the client experience | 🟢 |
| MVP | As an attorney, I want to assign a journey to a client so that I can track their progress | 🟢 |
| MVP | As an attorney, I want to see a client's journey progress so that I know where they are | 🟢 |
| MVP | As an attorney, I want to manually advance a journey step so that I can update progress | 🟢 |
| v1.1 | As a client, I want to see my journey progress so that I know what to expect | 📋 |
| v1.1 | As an attorney, I want automatic notifications when a journey step is due so that nothing falls through the cracks | 📋 |
| Future | As an attorney, I want journey steps to auto-advance based on triggers so that manual updates aren't needed | 📋 |
| Future | As an attorney, I want journey analytics so that I can identify bottlenecks | 📋 |

---

## Persona: Client

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As a client, I want to sign documents electronically so that I don't have to visit the office | 🟢 |
| MVP | As a client, I want to fill out forms online so that I can provide information conveniently | 📋 |
| MVP | As a client, I want to schedule appointments online so that I don't have to call | 📋 |
| v1.1 | As a client, I want to access my signed documents so that I have copies | 📋 |
| v1.1 | As a client, I want to see my matter status so that I know what's happening | 📋 |
| v1.1 | As a client, I want to pay invoices online so that payment is easy | 📋 |
| Future | As a client, I want to message my attorney securely so that I can ask questions | 📋 |
| Future | As a client, I want to notify my attorney of life changes so that my documents stay current | 📋 |

---

## Persona: Staff

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As staff, I want to view a dashboard of all client journeys in progress with indicators of "stuck" journeys | 📋 |
| MVP | As staff, I want to view client records so that I can assist with matters | 🟢 |
| MVP | As staff, I want to add notes to client records so that I can document interactions | 🟢 |
| MVP | As staff, I want to upload documents to matters so that files are organized | 🟢 |
| MVP | As staff, I want to see my assigned tasks so that I know what to work on | 📋 |
| v1.1 | As staff, I want to send documents for signature on behalf of an attorney so that I can help with execution | 📋 |
| v1.1 | As staff, I want to schedule appointments so that I can manage the calendar | 📋 |
| v1.1 | As staff, I want to create invoices so that I can handle billing | 📋 |
| Future | As a paralegal, I want to prepare documents for attorney review so that drafting is efficient | 📋 |

---

## Persona: Practice Administrator / Owner

This persona focuses on aggregate practice health, performance metrics, and operational oversight rather than individual client work.

### Practice Overview & Dashboards

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As a practice admin, I want a dashboard showing all active journeys with status indicators so that I can see practice workload at a glance | 📋 |
| MVP | As a practice admin, I want to see journeys that are "stuck" (no progress in X days) so that I can intervene before clients fall through the cracks | 📋 |
| MVP | As a practice admin, I want to see matters by stage so that I understand the pipeline | 📋 |
| v1.1 | As a practice admin, I want to see aging of matters (time in current stage) so that I can identify bottlenecks | 📋 |
| v1.1 | As a practice admin, I want to filter dashboards by attorney/staff member so that I can assess individual workloads | 📋 |
| Future | As a practice admin, I want trend analysis over time so that I can see if things are improving or declining | 📋 |

---

### Financial Oversight

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As a practice admin, I want to see total revenue by period so that I know how the practice is performing | 📋 |
| MVP | As a practice admin, I want to see outstanding receivables so that I can prioritize collections | 📋 |
| v1.1 | As a practice admin, I want revenue by matter type so that I can see which services are most profitable | 📋 |
| v1.1 | As a practice admin, I want revenue by referral source so that I can evaluate marketing effectiveness | 📋 |
| v1.1 | As a practice admin, I want to see average matter value so that I can track pricing effectiveness | 📋 |
| Future | As a practice admin, I want profitability analysis by matter type so that I can make strategic decisions | 📋 |
| Future | As a practice admin, I want cash flow forecasting based on pipeline so that I can plan ahead | 📋 |

---

### Client & Pipeline Metrics

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As a practice admin, I want to see new clients by period so that I can track growth | 📋 |
| MVP | As a practice admin, I want to see client source breakdown so that I know where clients come from | 🟡 |
| v1.1 | As a practice admin, I want to see conversion rate from prospect to client so that I can evaluate intake effectiveness | 📋 |
| v1.1 | As a practice admin, I want to see average time from intake to document execution so that I can measure throughput | 📋 |
| Future | As a practice admin, I want client lifetime value analysis so that I can understand long-term relationships | 📋 |
| Future | As a practice admin, I want referral partner performance metrics so that I can nurture top referrers | 📋 |

---

### Operational Health

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As a practice admin, I want to see documents pending signature so that I can follow up on bottlenecks | 🟡 |
| MVP | As a practice admin, I want to see overdue tasks across the practice so that nothing slips | 📋 |
| v1.1 | As a practice admin, I want staff workload visibility so that I can balance assignments | 📋 |
| v1.1 | As a practice admin, I want capacity planning based on current pipeline so that I know if we can take on more work | 📋 |
| Future | As a practice admin, I want automated alerts for at-risk matters so that I'm proactively notified | 📋 |
| Future | As a practice admin, I want SLA tracking (e.g., time to first response) so that I can maintain service standards | 📋 |

---

### Reporting & Analytics

| Priority | Story | Status |
|----------|-------|--------|
| v1.1 | As a practice admin, I want to export reports to CSV/PDF so that I can share with stakeholders | 📋 |
| v1.1 | As a practice admin, I want customizable date ranges on all reports so that I can analyze any period | 📋 |
| Future | As a practice admin, I want scheduled report delivery so that I get updates automatically | 📋 |
| Future | As a practice admin, I want year-over-year comparisons so that I can track long-term trends | 📋 |
| Future | As a practice admin, I want a "practice health score" that aggregates key metrics so that I have a single indicator to monitor | 📋 |

---

## Data Migration Stories

| Priority | Story | Status |
|----------|-------|--------|
| MVP | As an attorney, I want to import clients from Lawmatics so that I don't have to re-enter data | 📋 |
| MVP | As an attorney, I want to import estate plan metadata from WealthCounsel XML so that I have client plan information | 📋 |
| v1.1 | As an attorney, I want to import matters and documents from Lawmatics so that historical data is preserved | 📋 |
| Future | As an attorney, I want to import from Clio so that firms switching from Clio can migrate | 📋 |

---

## MVP Candidate Summary

Based on the map above, here are the stories tagged as MVP candidates:

### Must Have for Daily Use
1. Client record management (create, view, edit)
2. Family member/relationship tracking
3. Referral source tracking
4. Matter management (create, list, view)
5. Document storage per matter
6. Document generation from templates (basic field substitution)
7. E-signature workflow
8. Activity logging and viewing
9. Notes on clients and matters
10. Journey templates and progress tracking
11. Role-based access control

### MVP Gaps to Address
- [ ] Call logging (partially implemented)
- [ ] Invoice creation and tracking
- [ ] Administration matter type
- [ ] Asset/beneficiary tracking for administration
- [ ] Data migration tooling (Lawmatics, WealthCounsel)
- [ ] Practice admin dashboard with journey status overview
- [ ] "Stuck" journey identification
- [ ] Basic financial visibility (revenue, receivables)
- [ ] New client tracking by period

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-23 | Initial | Created user story map structure with attorney lifecycle |
| 2025-01-23 | Update | Added Practice Administrator/Owner persona with dashboard, financial, pipeline, operational, and reporting stories |
