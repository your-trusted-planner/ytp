// Billing & Trust Accounting System tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { clients } from './clients'
import { matters, payments } from './matters'
import { serviceCatalog } from './catalog'

// Trust Accounts - IOLTA/trust account tracking (single pooled account, extensible for multiple)
export const trustAccounts = sqliteTable('trust_accounts', {
  id: text('id').primaryKey(),
  accountName: text('account_name').notNull(), // e.g., "Client Trust Account"
  accountType: text('account_type', {
    enum: ['IOLTA', 'NON_IOLTA', 'ESCROW']
  }).notNull().default('IOLTA'),
  bankName: text('bank_name'),
  accountNumberLast4: text('account_number_last4'), // Masked for security
  routingNumber: text('routing_number'),

  // Running balance (updated on each transaction)
  currentBalance: integer('current_balance').notNull().default(0), // Cents

  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Trust Ledgers - Per-client balance within trust account
// Every client has their own ledger tracking their funds in the pooled trust account
export const clientTrustLedgers = sqliteTable('client_trust_ledgers', {
  id: text('id').primaryKey(),
  trustAccountId: text('trust_account_id').notNull().references(() => trustAccounts.id),
  clientId: text('client_id').notNull().references(() => clients.id),
  matterId: text('matter_id').references(() => matters.id), // Optional per-matter tracking

  // Current balance for this client in trust
  balance: integer('balance').notNull().default(0), // Cents

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Invoices - Bill clients for services rendered
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull().references(() => clients.id),

  invoiceNumber: text('invoice_number').notNull().unique(), // e.g., "INV-2026-0001"

  status: text('status', {
    enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'VOID']
  }).notNull().default('DRAFT'),

  // Amounts (all in cents)
  subtotal: integer('subtotal').notNull().default(0),
  taxRate: integer('tax_rate').default(0), // Basis points (e.g., 825 = 8.25%)
  taxAmount: integer('tax_amount').default(0),
  discountAmount: integer('discount_amount').default(0),
  totalAmount: integer('total_amount').notNull().default(0),

  // Payment tracking
  trustApplied: integer('trust_applied').notNull().default(0), // Applied from trust
  directPayments: integer('direct_payments').notNull().default(0), // Paid directly
  balanceDue: integer('balance_due').notNull().default(0), // Remaining

  // Dates
  issueDate: integer('issue_date', { mode: 'timestamp' }),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  paidAt: integer('paid_at', { mode: 'timestamp' }),

  // Content
  notes: text('notes'),
  terms: text('terms'),
  memo: text('memo'),

  // PDF storage
  pdfBlobKey: text('pdf_blob_key'),
  pdfGeneratedAt: integer('pdf_generated_at', { mode: 'timestamp' }),

  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Invoice Line Items - Individual items on an invoice
export const invoiceLineItems = sqliteTable('invoice_line_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),

  // Service catalog reference (optional)
  catalogId: text('catalog_id').references(() => serviceCatalog.id),

  description: text('description').notNull(),
  quantity: text('quantity').notNull().default('1'), // Text for decimal hours (e.g., "1.25")
  unitPrice: integer('unit_price').notNull(), // Cents
  amount: integer('amount').notNull(), // parseFloat(quantity) * unitPrice (cents)

  itemType: text('item_type', {
    enum: ['SERVICE', 'CONSULTATION', 'FILING_FEE', 'EXPENSE', 'ADJUSTMENT', 'HOURLY', 'OTHER']
  }).notNull().default('SERVICE'),

  // Time entry reference (when itemType='HOURLY')
  timeEntryId: text('time_entry_id'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Billing Rates - Per-client billing rate configuration
export const clientBillingRates = sqliteTable('client_billing_rates', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id).unique(),
  attorneyRate: integer('attorney_rate'), // Default attorney hourly rate for this client (cents)
  staffRate: integer('staff_rate'), // Default staff hourly rate for this client (cents)
  userRates: text('user_rates'), // JSON: {"userId": rateInCents} for user-specific rate overrides
  notes: text('notes'),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Matter Billing Rates - Per-matter billing rate configuration
export const matterBillingRates = sqliteTable('matter_billing_rates', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id).unique(),
  attorneyRate: integer('attorney_rate'), // Default attorney hourly rate for this matter (cents)
  staffRate: integer('staff_rate'), // Default staff hourly rate for this matter (cents)
  userRates: text('user_rates'), // JSON: {"userId": rateInCents} for user-specific rate overrides
  notes: text('notes'),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Time Entries - Track billable and non-billable time
export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  matterId: text('matter_id').notNull().references(() => matters.id),

  // Time details
  hours: text('hours').notNull(), // Text for decimal precision ("1.25")
  description: text('description').notNull(),
  workDate: integer('work_date', { mode: 'timestamp' }).notNull(),

  // Billing
  isBillable: integer('is_billable', { mode: 'boolean' }).default(true),
  hourlyRate: integer('hourly_rate'), // Rate at time of entry (resolved), cents
  amount: integer('amount'), // parseFloat(hours) * hourlyRate (cents)

  // Status workflow
  status: text('status', {
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'BILLED', 'WRITTEN_OFF']
  }).notNull().default('DRAFT'),

  // Invoice link (when billed)
  invoiceId: text('invoice_id').references(() => invoices.id),
  invoiceLineItemId: text('invoice_line_item_id'),

  // Approval
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Trust Transactions - Every movement of funds in/out of trust
// Critical for three-way reconciliation and audit trail
export const trustTransactions = sqliteTable('trust_transactions', {
  id: text('id').primaryKey(),
  trustAccountId: text('trust_account_id').notNull().references(() => trustAccounts.id),
  clientId: text('client_id').notNull().references(() => clients.id),
  matterId: text('matter_id').references(() => matters.id),

  // Transaction type
  transactionType: text('transaction_type', {
    enum: [
      'DEPOSIT',           // Client deposits retainer/advance
      'DISBURSEMENT',      // Transfer to operating for earned fees
      'EXPENSE',           // Pay client expense from trust
      'REFUND',            // Return unused funds to client
      'TRANSFER_IN',       // Transfer from another trust account
      'TRANSFER_OUT',      // Transfer to another trust account
      'ADJUSTMENT',        // Correction/adjustment
      'BANK_FEE',          // Bank fees (rare for IOLTA)
      'INTEREST'           // Interest earned (IOLTA goes to state bar)
    ]
  }).notNull(),

  // Amount (positive for deposits, negative for disbursements/expenses/refunds)
  amount: integer('amount').notNull(), // Cents (signed)

  // Running balance AFTER this transaction (for client)
  runningBalance: integer('running_balance').notNull(), // Cents

  // Description and references
  description: text('description').notNull(),
  referenceNumber: text('reference_number'), // Check #, wire ref, etc.
  checkNumber: text('check_number'),

  // Links to other entities
  invoiceId: text('invoice_id').references(() => invoices.id), // If disbursement for invoice
  paymentId: text('payment_id').references(() => payments.id), // If linked to payment record

  // Dates
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  clearedDate: integer('cleared_date', { mode: 'timestamp' }), // For reconciliation

  // Audit
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
