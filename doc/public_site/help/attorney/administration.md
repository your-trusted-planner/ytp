# Administration

Administrative features for system setup and configuration.

## WYDAPT Document Seeding

For administrators setting up the Wyoming Asset Protection Trust service:

1. Go to **Admin** → **Seed WYDAPT**
2. **Step 1: Upload Documents**
   - Select document group (General Documents, Trust Documents, etc.)
   - Upload DOCX files for that group
   - Repeat for all 7 document groups
3. **Step 2: Process & Import**
   - Click **Process & Import**
   - System creates:
     - WYDAPT Matter ($18,500)
     - Journey template with 7 steps
     - Document templates with extracted variables
4. If errors occur, use **Clean Up Partial Data** to reset and try again

## System Configuration

Administrators can:

- Manage user accounts and roles
- Create and modify matters
- Set up journey templates
- Upload document templates
- Configure integrations (LawPay, PandaDoc)

## Matters (Services)

Matters define the services your firm offers. Each matter can be connected to journey workflows and document templates.

### Creating a Matter

1. Go to **Matters** in the sidebar
2. Click **Add Matter**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Formation"
   - **Category**: Trust, LLC Formation, Maintenance, etc.
   - **Description**: What this service includes
   - **Type**: Single (one-time) or Recurring (ongoing)
   - **Price**: Service fee
   - **Billing Frequency** (for recurring): Monthly, Quarterly, Annually
4. Click **Save**

### Example Matters

| Matter | Type | Price |
|--------|------|-------|
| Wyoming Asset Protection Trust (WYDAPT) | Single | $18,500 |
| Annual Trust Maintenance | Recurring (Annual) | $500 |
| LLC Formation - Wyoming | Single | $2,500 |
