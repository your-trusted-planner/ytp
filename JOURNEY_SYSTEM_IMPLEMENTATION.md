# Customer Journey System - Complete Implementation Plan

**Project:** Your Trusted Planner - Journey System Overhaul  
**Date:** December 3, 2025  
**Transcript Source:** Chris Owen Sync - Nov 24, 2025  
**Status:** 🚧 IN PROGRESS

---

## 📋 IMPLEMENTATION CHECKLIST

### **🎯 PHASE 1: CORE JOURNEY ARCHITECTURE**

#### **1. Terminology & Conceptual Updates**
- [ ] Replace "pipeline" → "journey" throughout platform
- [ ] Update database schema references
- [ ] Update UI labels, navigation, user-facing text
- [ ] Update API endpoints and documentation
- [ ] Update internal nomenclature (SIMYI → Snapshot)

#### **2. Two-Step Journey System**
**Milestone Steps** (binary destination points):
- [ ] Database schema for milestone steps
- [ ] UI components for milestone display
- [ ] Status tracking (pending, complete)
- [ ] Automatic progression logic

**Bridge Steps** (circular feedback loops):
- [ ] Database schema for bridge steps
- [ ] Circular/loop visualization
- [ ] Multi-iteration support
- [ ] Dual-party approval system

#### **3. Bridge Step Core Functionality**
- [ ] Assign responsible parties (CLIENT + COUNCIL/STAFF)
- [ ] Status tracking per party (waiting/complete/approved)
- [ ] Automated reminders (until both parties complete)
- [ ] AI agent integration hooks
- [ ] FAQ/help resource connections
- [ ] Async communication (chat/messaging)
- [ ] Meeting scheduling capability
- [ ] Escalation to human support

---

### **📊 PHASE 2: JOURNEY BUILDER INTERFACE**

#### **4. Visual Journey Designer**
- [ ] Kanban-style drag-and-drop builder
- [ ] Step reordering functionality
- [ ] Visual distinction (milestone vs. bridge)
- [ ] Arrow/connector visualization
- [ ] Unlimited custom journeys per matter
- [ ] Journey templates library
- [ ] Clone/duplicate journeys
- [ ] Import/export journey configs

#### **5. Step Configuration Panel**
For each step:
- [ ] Step type selector (Milestone/Bridge)
- [ ] Custom naming field
- [ ] Responsible party assignment dropdown
- [ ] Multiple action items association
- [ ] Automation trigger builder
- [ ] Expected duration field
- [ ] Help content editor
- [ ] Prerequisites/dependencies

#### **6. Action Item System**
Support multiple action types:
- [ ] **Questionnaires** - fillable forms
- [ ] **Decisions** - radio/checkbox selections
- [ ] **Document Upload** - client provides docs
- [ ] **Document Review** - council reviews
- [ ] **E-Signature** - electronic signing
- [ ] **Notarization** - PandaDoc integration
- [ ] **KYC/Identity Verification** - passport, utility bills
- [ ] **Payment** - LawPay trigger
- [ ] **Meeting/Appointment** - scheduling
- [ ] Action item status tracking
- [ ] Action item templates

---

### **📝 PHASE 3: DOCUMENT & UPLOAD SYSTEM**

#### **7. Document Categories**
- [ ] Pre-existing Legal Documents (trusts, wills, prenups, operating agreements)
- [ ] Financial Statements (bank, investment accounts)
- [ ] Identity Documents (passport, DL, SSN)
- [ ] Proof of Address (utility, lease)
- [ ] Custom category creation

#### **8. Upload & Management**
- [ ] Drag-and-drop multi-file upload
- [ ] File type validation
- [ ] File size limits
- [ ] Virus scanning integration (ClamAV or cloud service)
- [ ] Document preview (PDF, images, Word)
- [ ] Version control system
- [ ] Review status workflow (pending → reviewed → approved)
- [ ] Council annotations/notes on documents
- [ ] Download original files
- [ ] Audit trail (who uploaded when)

#### **9. Signature & Notarization Logic**
- [ ] "Requires Signature" checkbox → e-sign flow
- [ ] "Requires Notarization" checkbox → PandaDoc flow
- [ ] Combined flow (e-sign then notarize)
- [ ] Separate status tracking per requirement
- [ ] PandaDoc API integration (API key: 94594783480feb0cb4837f71bfd5417928b31d73)
- [ ] Notarization appointment scheduling
- [ ] Video notary session handling
- [ ] Notarized document retrieval
- [ ] Status webhooks from PandaDoc

---

### **🔄 PHASE 4: SNAPSHOT PROCESS**

#### **10. Snapshot Feature**
Critical bottleneck identified in transcript:
- [ ] Dedicated "Snapshot" document type
- [ ] Auto-generate from client data:
  - Documents being created
  - Named trustees/fiduciaries
  - Trust name(s)
  - Beneficiary structure
  - Key addresses
- [ ] Snapshot template builder
- [ ] Variable substitution engine
- [ ] PDF generation for client review

#### **11. Snapshot Workflow**
- [ ] **Snapshot In Progress** (milestone) - lawyer creating
- [ ] **Snapshot Sent** (milestone) - sent to client
- [ ] **Snapshot Review & Revision** (BRIDGE) - circular loop
  - Multiple iteration support
  - Version comparison view
  - Change request tracking
  - Comments/notes per section
- [ ] **Snapshot Approved** (milestone) - both parties signed off
- [ ] Email notifications per state change
- [ ] Revision history log
- [ ] Side-by-side version comparison

---

### **🤖 PHASE 5: AI AGENT & AUTOMATION**

#### **12. Smart Bridge Assistant**
- [ ] Conversational AI chatbot integration (OpenAI/Anthropic)
- [ ] Context-aware responses per journey step
- [ ] FAQ library database
- [ ] Historical Q&A training data import
- [ ] Proactive help triggers:
  - "Stuck on questionnaire? Common issues..."
  - "Most clients ask about X, Y, Z"
- [ ] Escalation logic (AI → human handoff)
- [ ] Chat interface in bridge steps
- [ ] Chat history storage
- [ ] AI response quality feedback loop

#### **13. Lawmatics Data Migration**
- [ ] API integration to Lawmatics
- [ ] Extract timeline/activity data
- [ ] Import email threads
- [ ] Import automation notes
- [ ] Parse Q&A patterns
- [ ] Store as AI training dataset
- [ ] Analyze historical bottlenecks
- [ ] One-time migration script
- [ ] Ongoing sync (optional)

---

### **👥 PHASE 6: MATTER-JOURNEY RELATIONSHIPS**

#### **14. Matter ↔ Journey Mapping**
- [ ] One matter → multiple journeys relationship
- [ ] Journey assignment to matters
- [ ] Example mappings:
  - Wyoming Asset Protection Trust → (Consultation, Formation, Maintenance, LLC Formation)
- [ ] Client on multiple simultaneous journeys
- [ ] Journey priority/ordering
- [ ] Revenue tracking per journey (link to existing matters system)
- [ ] Journey completion triggers matter status updates

#### **15. Client-Facing Journey Communication**
Language changes per Chris's guidance:
- [ ] Dashboard: "Your Active Journeys" (not "matters")
- [ ] Email templates: "Update on Your [Journey Name]"
- [ ] SMS templates: journey-focused language
- [ ] Phone scripts/suggested language
- [ ] Internal views: still show "matter" for legal/financial
- [ ] Toggle between "journey view" (client) and "matter view" (internal)

---

### **📋 PHASE 7: HOMEWORK & ACTION TRACKING**

#### **16. Enhanced Homework System**
- [ ] Homework item types:
  - Complete questionnaire
  - Make decision (radio/checkbox)
  - Upload documents
  - Review and approve
  - Schedule meeting
  - Make payment
- [ ] Each homework has:
  - Title/description
  - Due date (optional)
  - Priority level (low/medium/high/urgent)
  - Instructions/help text
  - Related documents/resources
  - Completion status
  - Completion timestamp
  - Assigned to (client/lawyer/both)

#### **17. Office Hours / Support Bridge**
- [ ] "Office Hours" bridge step template
- [ ] Async question asking (doesn't block progress)
- [ ] Scheduled office hours (calendar integration)
- [ ] Question queue for lawyer review
- [ ] Common question flagging for FAQ
- [ ] AI attempts first response
- [ ] Human review if needed
- [ ] Question resolution tracking

---

### **🎨 PHASE 8: UX/UI ENHANCEMENTS**

#### **18. Client-Facing Journey Map**
- [ ] Visual progress roadmap
- [ ] Progress percentage indicator
- [ ] Completed steps (green checkmarks)
- [ ] Current step (highlighted/pulsing)
- [ ] Upcoming steps (grayed/locked)
- [ ] Estimated time to completion
- [ ] Mobile-responsive design
- [ ] Tooltip help on each step
- [ ] Click to expand step details

#### **19. Lawyer Kanban Board**
Inspired by Lawmatics:
- [ ] Drag clients between steps
- [ ] Aggregated view (all clients in journey)
- [ ] Filters:
  - By matter type
  - By assigned lawyer
  - By status
  - By overdue items
- [ ] Total value per step aggregation
- [ ] Click client card → detail view
- [ ] Bulk actions:
  - Move multiple clients
  - Send bulk reminders
  - Bulk status updates
- [ ] Search/filter clients
- [ ] Export to CSV

#### **20. Bridge Step Visual Indicators**
- [ ] Circle icon for bridge (vs. square for milestone)
- [ ] Color coding:
  - Green: both parties complete
  - Yellow: waiting on client
  - Blue: waiting on lawyer
  - Red: overdue
- [ ] Countdown timers for due dates
- [ ] Iteration counter (showing revision #)
- [ ] Hover tooltips showing status details
- [ ] Animated indicators for active bridges

---

### **⚙️ PHASE 9: CONTENT LAKE (FUTURE)**

#### **21. Strappy/Ghost Integration** *(Low Priority - Phase 2)*
- [ ] Document Strappy schema requirements
- [ ] Evaluate Ghost.io as front-end CMS
- [ ] API integration planning
- [ ] Content migration strategy
- [ ] Blog/article system
- [ ] FAQ content management
- [ ] Email template library
- [ ] Version control for content
- [ ] Multi-channel content distribution

---

### **🔗 PHASE 10: INTEGRATIONS**

#### **22. PandaDoc Notarization**
**API Key:** `94594783480feb0cb4837f71bfd5417928b31d73`

- [ ] PandaDoc SDK integration
- [ ] Document upload to PandaDoc
- [ ] Notarization request creation
- [ ] Signer configuration
- [ ] Notary appointment scheduling
- [ ] Webhook endpoint for status updates
- [ ] Video session URL retrieval
- [ ] Completed document download
- [ ] Certificate of completion storage
- [ ] Error handling and retries
- [ ] Test mode vs. production mode

#### **23. Marketing Source & UTM Tracking**
- [ ] Capture UTM parameters on all entry points
- [ ] Store marketing source per lead/client
- [ ] Lead acquisition cost tracking
- [ ] ROI per marketing channel
- [ ] Conversion rate by source
- [ ] Dashboard analytics widgets
- [ ] Source attribution reporting
- [ ] A/B test tracking support

#### **24. Automation Engine**
- [ ] Visual automation builder UI
- [ ] Trigger configuration:
  - Time-based (X days after Y)
  - Event-based (on status change)
  - Conditional (if X then Y else Z)
- [ ] Action types:
  - Send email
  - Send SMS
  - Advance step
  - Assign task
  - Create notification
  - Trigger webhook
- [ ] Conditional branching logic (married/not married, etc.)
- [ ] Email/SMS provider integration
- [ ] Automation history log
- [ ] Test/preview automations
- [ ] Enable/disable automations

---

### **📊 PHASE 11: DATABASE SCHEMA**

#### **25. New Tables**

**`journeys`**
```sql
- id (primary key)
- matter_id (foreign key)
- name (text)
- description (text)
- is_active (boolean)
- created_at, updated_at
```

**`journey_steps`**
```sql
- id (primary key)
- journey_id (foreign key)
- step_type (enum: MILESTONE, BRIDGE)
- name (text)
- description (text)
- step_order (integer)
- responsible_party (enum: CLIENT, COUNCIL, STAFF, BOTH)
- expected_duration_days (integer)
- automation_config (json)
- help_content (text)
- created_at, updated_at
```

**`client_journeys`**
```sql
- id (primary key)
- client_id (foreign key)
- journey_id (foreign key)
- current_step_id (foreign key)
- status (enum: NOT_STARTED, IN_PROGRESS, COMPLETED, PAUSED)
- started_at, completed_at
- created_at, updated_at
```

**`journey_step_progress`**
```sql
- id (primary key)
- client_journey_id (foreign key)
- step_id (foreign key)
- status (enum: PENDING, IN_PROGRESS, WAITING_CLIENT, WAITING_COUNCIL, COMPLETE)
- client_approved (boolean)
- council_approved (boolean)
- client_approved_at (timestamp)
- council_approved_at (timestamp)
- iteration_count (integer) -- for bridge steps
- started_at, completed_at
- created_at, updated_at
```

**`action_items`**
```sql
- id (primary key)
- step_id (foreign key)
- client_journey_id (foreign key)
- action_type (enum: QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY, PAYMENT, MEETING, KYC)
- title (text)
- description (text)
- config (json) -- type-specific settings
- status (enum: PENDING, IN_PROGRESS, COMPLETE, SKIPPED)
- assigned_to (enum: CLIENT, COUNCIL, STAFF)
- due_date (timestamp)
- priority (enum: LOW, MEDIUM, HIGH, URGENT)
- completed_at (timestamp)
- created_at, updated_at
```

**`bridge_conversations`**
```sql
- id (primary key)
- step_progress_id (foreign key)
- user_id (foreign key)
- message (text)
- is_ai_response (boolean)
- created_at
```

**`faq_library`**
```sql
- id (primary key)
- journey_id (foreign key) -- optional, can be global
- step_id (foreign key) -- optional
- question (text)
- answer (text)
- category (text)
- view_count (integer)
- helpful_count (integer)
- created_at, updated_at
```

**`document_uploads`**
```sql
- id (primary key)
- client_journey_id (foreign key)
- action_item_id (foreign key)
- uploaded_by_user_id (foreign key)
- document_category (text)
- file_name (text)
- file_path (text)
- file_size (integer)
- mime_type (text)
- status (enum: PENDING_REVIEW, REVIEWED, APPROVED, REJECTED)
- reviewed_by_user_id (foreign key)
- reviewed_at (timestamp)
- review_notes (text)
- version (integer)
- created_at, updated_at
```

**`snapshot_versions`**
```sql
- id (primary key)
- client_journey_id (foreign key)
- version_number (integer)
- content (json) -- structured snapshot data
- generated_pdf_path (text)
- status (enum: DRAFT, SENT, UNDER_REVISION, APPROVED)
- sent_at (timestamp)
- approved_at (timestamp)
- approved_by_client (boolean)
- approved_by_council (boolean)
- created_at, updated_at
```

**`automations`**
```sql
- id (primary key)
- journey_id (foreign key)
- step_id (foreign key) -- optional
- name (text)
- trigger_type (enum: TIME_BASED, EVENT_BASED, CONDITIONAL)
- trigger_config (json)
- action_config (json)
- is_active (boolean)
- created_at, updated_at
```

**`marketing_sources`**
```sql
- id (primary key)
- name (text)
- utm_source (text)
- utm_medium (text)
- utm_campaign (text)
- acquisition_cost (integer) -- in cents
- created_at, updated_at
```

**`client_marketing_attribution`**
```sql
- id (primary key)
- client_id (foreign key)
- marketing_source_id (foreign key)
- utm_source, utm_medium, utm_campaign, utm_content, utm_term (text)
- referrer_url (text)
- landing_page (text)
- created_at
```

---

### **🧪 PHASE 12: TESTING & VALIDATION**

#### **26. Comprehensive Testing**
- [ ] Unit tests for journey logic
- [ ] Integration tests for PandaDoc
- [ ] Bridge step circular logic (multiple iterations)
- [ ] Dual-party approval system
- [ ] Journey builder (create from scratch)
- [ ] Drag-and-drop functionality
- [ ] AI agent responses
- [ ] Lawmatics import (if credentials available)
- [ ] E-signature vs. notarization routing
- [ ] Document upload (file types, sizes, validation)
- [ ] Mobile responsive testing (all screen sizes)
- [ ] Cross-browser testing
- [ ] Performance testing (100+ clients in journey)
- [ ] Security testing (file upload vulnerabilities)
- [ ] API endpoint testing

---

### **📦 PHASE 13: DEPLOYMENT & MIGRATION**

#### **27. Migration Strategy**
- [ ] Backup existing database
- [ ] Run schema migrations
- [ ] Migrate existing "matters" data to new structure
- [ ] Create default journey templates
- [ ] Migrate existing clients to appropriate journeys
- [ ] Test on staging environment
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Rollback plan if needed

#### **28. Documentation**
- [ ] API documentation updates
- [ ] User guide (lawyer)
- [ ] User guide (client)
- [ ] Journey builder tutorial
- [ ] Video walkthrough
- [ ] FAQ updates
- [ ] Changelog

---

## 🎯 PRIORITY MATRIX

### **MUST HAVE (MVP)**
1. Journey terminology update
2. Milestone + Bridge architecture
3. Journey builder UI
4. Kanban board
5. Snapshot workflow
6. Document upload system
7. E-signature vs. notarization logic
8. PandaDoc integration

### **SHOULD HAVE (Phase 1.5)**
9. AI agent for bridge steps
10. Enhanced homework system
11. Client journey map
12. Automation engine basics

### **NICE TO HAVE (Phase 2)**
13. Lawmatics import
14. Advanced analytics
15. Strappy/Ghost CMS
16. Marketing attribution

---

## 📅 ESTIMATED TIMELINE

- **Phase 1-2 (Core Architecture):** 3-4 days
- **Phase 3-4 (Documents & Snapshot):** 2-3 days
- **Phase 5-7 (AI & Homework):** 3-4 days
- **Phase 8 (UX/UI):** 2-3 days
- **Phase 10-11 (Integrations & DB):** 2-3 days
- **Phase 12-13 (Testing & Deploy):** 1-2 days

**Total:** ~15-20 days of focused development

---

## 🔑 API CREDENTIALS

### **PandaDoc**
- **Playground API Key:** `94594783480feb0cb4837f71bfd5417928b31d73`
- **Environment:** Sandbox/Testing
- **Documentation:** https://developers.pandadoc.com/

### **Pending from Client**
- [ ] LawPay API credentials
- [ ] Google Calendar API credentials
- [ ] Lawmatics API credentials (if migration desired)
- [ ] Email provider credentials (SendGrid/Mailgun)
- [ ] SMS provider credentials (Twilio)

---

## ✅ COMPLETION CRITERIA

**System is complete when:**
1. ✅ All database tables created and migrated
2. ✅ Journey builder functional (create, edit, delete journeys)
3. ✅ Bridge steps support multiple iterations with dual approval
4. ✅ Kanban board allows drag-and-drop client movement
5. ✅ Document upload supports all required file types
6. ✅ PandaDoc integration sends and tracks notarizations
7. ✅ Snapshot workflow handles revisions
8. ✅ AI agent answers common questions in bridge steps
9. ✅ Client sees visual journey map
10. ✅ All tests pass
11. ✅ Deployed to production
12. ✅ Client trained and signed off

---

**Last Updated:** December 3, 2025  
**Implementation Status:** 🚧 READY TO BEGIN


