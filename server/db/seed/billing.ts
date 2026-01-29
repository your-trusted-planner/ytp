import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedClientIds, SeedMatterIds, SeedServiceIds } from './types'

export async function seedBilling(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  clientIds: SeedClientIds,
  matterIds: SeedMatterIds,
  serviceIds: SeedServiceIds
): Promise<void> {
  console.log('Seeding billing & trust accounting...')

  const { now, oneWeekAgo, twoWeeksAgo, oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { lawyerId, staffId, lawyer2Id } = userIds
  const { janeClientId, michaelClientId, sarahClientId } = clientIds
  const { matter1Id, matter2Id, matter3Id } = matterIds
  const { service1Id } = serviceIds
  const billingIds = SEED_IDS.billing

  // Create the firm's trust account (IOLTA)
  const trustAccountId = billingIds.trustAccount
  await db.insert(schema.trustAccounts).values({
    id: trustAccountId,
    accountName: 'Client Trust Account (IOLTA)',
    accountType: 'IOLTA',
    bankName: 'First National Bank of Wyoming',
    accountNumberLast4: '4567',
    routingNumber: '102000076',
    currentBalance: 1285000,
    isActive: true,
    createdAt: threeMonthsAgo,
    updatedAt: now
  }).onConflictDoNothing()
  console.log('  Created trust account')

  // Client trust ledgers
  const janeLedgerId = billingIds.ledger_jane
  await db.insert(schema.clientTrustLedgers).values({
    id: janeLedgerId,
    trustAccountId,
    clientId: janeClientId,
    matterId: matter1Id,
    balance: 535000,
    createdAt: twoMonthsAgo,
    updatedAt: now
  }).onConflictDoNothing()

  await db.insert(schema.clientTrustLedgers).values({
    id: billingIds.ledger_sarah,
    trustAccountId,
    clientId: sarahClientId,
    matterId: matter3Id,
    balance: 0,
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.clientTrustLedgers).values({
    id: billingIds.ledger_michael,
    trustAccountId,
    clientId: michaelClientId,
    balance: 750000,
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()
  console.log('  Created 3 client trust ledgers')

  // Trust transactions for Jane Doe
  const janeTx1Id = billingIds.tx_jane_deposit
  await db.insert(schema.trustTransactions).values({
    id: janeTx1Id,
    trustAccountId,
    clientId: janeClientId,
    matterId: matter1Id,
    transactionType: 'DEPOSIT',
    amount: 925000,
    runningBalance: 925000,
    description: 'Initial retainer deposit - WYDAPT engagement',
    referenceNumber: 'CHK-10234',
    checkNumber: '10234',
    transactionDate: twoMonthsAgo,
    clearedDate: new Date(twoMonthsAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    createdBy: lawyerId,
    createdAt: twoMonthsAgo
  }).onConflictDoNothing()

  const janeTx2Id = billingIds.tx_jane_disbursement
  await db.insert(schema.trustTransactions).values({
    id: janeTx2Id,
    trustAccountId,
    clientId: janeClientId,
    matterId: matter1Id,
    transactionType: 'DISBURSEMENT',
    amount: -250000,
    runningBalance: 675000,
    description: 'Disbursement for INV-2026-0001 - Document preparation services',
    transactionDate: oneMonthAgo,
    createdBy: lawyerId,
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  const janeTx3Id = billingIds.tx_jane_expense
  await db.insert(schema.trustTransactions).values({
    id: janeTx3Id,
    trustAccountId,
    clientId: janeClientId,
    matterId: matter1Id,
    transactionType: 'EXPENSE',
    amount: -14000,
    runningBalance: 535000,
    description: 'Wyoming LLC filing fee - Secretary of State',
    referenceNumber: 'WY-LLC-2026-4521',
    transactionDate: twoWeeksAgo,
    createdBy: staffId,
    createdAt: twoWeeksAgo
  }).onConflictDoNothing()

  // Trust transactions for Sarah Williams
  await db.insert(schema.trustTransactions).values({
    id: billingIds.tx_sarah_deposit1,
    trustAccountId,
    clientId: sarahClientId,
    matterId: matter3Id,
    transactionType: 'DEPOSIT',
    amount: 925000,
    runningBalance: 925000,
    description: 'Initial retainer deposit - WYDAPT engagement',
    referenceNumber: 'WIRE-98765',
    transactionDate: threeMonthsAgo,
    clearedDate: threeMonthsAgo,
    createdBy: lawyerId,
    createdAt: threeMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.trustTransactions).values({
    id: billingIds.tx_sarah_deposit2,
    trustAccountId,
    clientId: sarahClientId,
    matterId: matter3Id,
    transactionType: 'DEPOSIT',
    amount: 925000,
    runningBalance: 1850000,
    description: 'Final payment deposit - WYDAPT completion',
    referenceNumber: 'CHK-5678',
    checkNumber: '5678',
    transactionDate: twoMonthsAgo,
    clearedDate: new Date(twoMonthsAgo.getTime() + 3 * 24 * 60 * 60 * 1000),
    createdBy: lawyerId,
    createdAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.trustTransactions).values({
    id: billingIds.tx_sarah_disbursement,
    trustAccountId,
    clientId: sarahClientId,
    matterId: matter3Id,
    transactionType: 'DISBURSEMENT',
    amount: -1850000,
    runningBalance: 0,
    description: 'Final disbursement - Matter completed',
    transactionDate: oneMonthAgo,
    createdBy: lawyerId,
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  // Trust transaction for Michael Johnson
  await db.insert(schema.trustTransactions).values({
    id: billingIds.tx_michael_deposit,
    trustAccountId,
    clientId: michaelClientId,
    transactionType: 'DEPOSIT',
    amount: 750000,
    runningBalance: 750000,
    description: 'Consultation retainer deposit',
    referenceNumber: 'ACH-2026-0042',
    transactionDate: oneWeekAgo,
    clearedDate: new Date(oneWeekAgo.getTime() + 1 * 24 * 60 * 60 * 1000),
    createdBy: lawyerId,
    createdAt: oneWeekAgo
  }).onConflictDoNothing()
  console.log('  Created 7 trust transactions')

  // Invoices
  const invoice1Id = billingIds.invoice1
  await db.insert(schema.invoices).values({
    id: invoice1Id,
    matterId: matter1Id,
    clientId: janeClientId,
    invoiceNumber: 'INV-2026-0001',
    status: 'PAID',
    subtotal: 250000,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 250000,
    trustApplied: 250000,
    directPayments: 0,
    balanceDue: 0,
    issueDate: oneMonthAgo,
    dueDate: new Date(oneMonthAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    sentAt: oneMonthAgo,
    paidAt: oneMonthAgo,
    notes: 'Thank you for your business.',
    terms: 'Payment due within 30 days of invoice date.',
    createdBy: lawyerId,
    createdAt: oneMonthAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  // Invoice 1 line items
  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem1_1,
    invoiceId: invoice1Id,
    lineNumber: 1,
    catalogId: service1Id,
    description: 'Document preparation - Trust Declaration draft',
    quantity: 5,
    unitPrice: 35000,
    amount: 175000,
    itemType: 'SERVICE',
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem1_2,
    invoiceId: invoice1Id,
    lineNumber: 2,
    description: 'Legal research - Wyoming DAPT statutes',
    quantity: 2,
    unitPrice: 35000,
    amount: 70000,
    itemType: 'SERVICE',
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem1_3,
    invoiceId: invoice1Id,
    lineNumber: 3,
    description: 'Document review and revisions',
    quantity: 1,
    unitPrice: 5000,
    amount: 5000,
    itemType: 'SERVICE',
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  const invoice2Id = billingIds.invoice2
  await db.insert(schema.invoices).values({
    id: invoice2Id,
    matterId: matter1Id,
    clientId: janeClientId,
    invoiceNumber: 'INV-2026-0002',
    status: 'SENT',
    subtotal: 29000,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 29000,
    trustApplied: 14000,
    directPayments: 0,
    balanceDue: 15000,
    issueDate: twoWeeksAgo,
    dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    sentAt: twoWeeksAgo,
    notes: 'Filing fees for LLC formation.',
    terms: 'Payment due within 30 days of invoice date.',
    createdBy: staffId,
    createdAt: twoWeeksAgo,
    updatedAt: twoWeeksAgo
  }).onConflictDoNothing()

  // Invoice 2 line items
  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem2_1,
    invoiceId: invoice2Id,
    lineNumber: 1,
    description: 'Wyoming LLC filing fee',
    quantity: 1,
    unitPrice: 14000,
    amount: 14000,
    itemType: 'FILING_FEE',
    createdAt: twoWeeksAgo
  }).onConflictDoNothing()

  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem2_2,
    invoiceId: invoice2Id,
    lineNumber: 2,
    description: 'Registered agent fee (1 year)',
    quantity: 1,
    unitPrice: 15000,
    amount: 15000,
    itemType: 'EXPENSE',
    createdAt: twoWeeksAgo
  }).onConflictDoNothing()

  const invoice3Id = billingIds.invoice3
  await db.insert(schema.invoices).values({
    id: invoice3Id,
    matterId: matter3Id,
    clientId: sarahClientId,
    invoiceNumber: 'INV-2026-0003',
    status: 'PAID',
    subtotal: 1850000,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 1850000,
    trustApplied: 1850000,
    directPayments: 0,
    balanceDue: 0,
    issueDate: oneMonthAgo,
    dueDate: new Date(oneMonthAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    sentAt: oneMonthAgo,
    paidAt: oneMonthAgo,
    notes: 'Final invoice for Wyoming Asset Protection Trust formation.',
    terms: 'Payment due within 30 days of invoice date.',
    createdBy: lawyer2Id,
    createdAt: oneMonthAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  // Invoice 3 line item
  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem3_1,
    invoiceId: invoice3Id,
    lineNumber: 1,
    catalogId: service1Id,
    description: 'Wyoming Asset Protection Trust - Complete Formation',
    quantity: 1,
    unitPrice: 1850000,
    amount: 1850000,
    itemType: 'SERVICE',
    createdAt: oneMonthAgo
  }).onConflictDoNothing()

  const invoice4Id = billingIds.invoice4
  await db.insert(schema.invoices).values({
    id: invoice4Id,
    matterId: matter1Id,
    clientId: janeClientId,
    invoiceNumber: 'INV-2026-0004',
    status: 'DRAFT',
    subtotal: 925000,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 925000,
    trustApplied: 0,
    directPayments: 0,
    balanceDue: 925000,
    notes: 'Final payment for WYDAPT formation upon completion.',
    terms: 'Payment due within 30 days of invoice date.',
    createdBy: lawyerId,
    createdAt: now,
    updatedAt: now
  }).onConflictDoNothing()

  // Invoice 4 line item
  await db.insert(schema.invoiceLineItems).values({
    id: billingIds.lineItem4_1,
    invoiceId: invoice4Id,
    lineNumber: 1,
    catalogId: service1Id,
    description: 'Wyoming Asset Protection Trust - Final Payment (50%)',
    quantity: 1,
    unitPrice: 925000,
    amount: 925000,
    itemType: 'SERVICE',
    createdAt: now
  }).onConflictDoNothing()

  console.log('  Created 4 invoices with 7 line items')

  // Payment records
  await db.insert(schema.payments).values({
    id: billingIds.payment1,
    matterId: matter1Id,
    paymentType: 'DEPOSIT_50',
    amount: 925000,
    paymentMethod: 'CHECK',
    status: 'COMPLETED',
    paidAt: twoMonthsAgo,
    fundSource: 'TRUST',
    trustTransactionId: janeTx1Id,
    checkNumber: '10234',
    referenceNumber: 'CHK-10234',
    recordedBy: lawyerId,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.payments).values({
    id: billingIds.payment2,
    matterId: matter1Id,
    paymentType: 'CUSTOM',
    amount: 250000,
    paymentMethod: 'CHECK',
    status: 'COMPLETED',
    paidAt: oneMonthAgo,
    notes: 'Document preparation invoice payment',
    fundSource: 'TRUST',
    trustTransactionId: janeTx2Id,
    invoiceId: invoice1Id,
    recordedBy: lawyerId,
    createdAt: oneMonthAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.payments).values({
    id: billingIds.payment3,
    matterId: matter3Id,
    paymentType: 'DEPOSIT_50',
    amount: 925000,
    paymentMethod: 'WIRE',
    status: 'COMPLETED',
    paidAt: threeMonthsAgo,
    fundSource: 'TRUST',
    referenceNumber: 'WIRE-98765',
    recordedBy: lawyerId,
    createdAt: threeMonthsAgo,
    updatedAt: threeMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.payments).values({
    id: billingIds.payment4,
    matterId: matter3Id,
    paymentType: 'FINAL_50',
    amount: 925000,
    paymentMethod: 'CHECK',
    status: 'COMPLETED',
    paidAt: twoMonthsAgo,
    fundSource: 'TRUST',
    checkNumber: '5678',
    referenceNumber: 'CHK-5678',
    invoiceId: invoice3Id,
    recordedBy: lawyerId,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.payments).values({
    id: billingIds.payment5,
    matterId: matter2Id,
    paymentType: 'CONSULTATION',
    amount: 750000,
    paymentMethod: 'ACH',
    status: 'COMPLETED',
    paidAt: oneWeekAgo,
    notes: 'Consultation retainer for estate planning review',
    fundSource: 'TRUST',
    referenceNumber: 'ACH-2026-0042',
    recordedBy: lawyerId,
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  console.log('  Created 5 payment records')
}
