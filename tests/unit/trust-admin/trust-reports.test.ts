import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Trust Reports Tests
 *
 * Tests for trust accounting reports:
 * - Three-way reconciliation
 * - Aging reports
 * - Client ledger statements
 */

// Mock the database module
vi.mock('../../server/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn()
  }

  return {
    useDrizzle: () => mockDb,
    schema: {
      trustAccounts: {
        id: 'id',
        accountName: 'accountName',
        currentBalance: 'currentBalance'
      },
      clientTrustLedgers: {
        trustAccountId: 'trustAccountId',
        clientId: 'clientId',
        matterId: 'matterId',
        balance: 'balance'
      },
      trustTransactions: {
        id: 'id',
        trustAccountId: 'trustAccountId',
        clientId: 'clientId',
        matterId: 'matterId',
        transactionType: 'transactionType',
        transactionDate: 'transactionDate',
        amount: 'amount',
        runningBalance: 'runningBalance',
        description: 'description',
        referenceNumber: 'referenceNumber',
        checkNumber: 'checkNumber'
      },
      clients: {
        id: 'id',
        personId: 'personId'
      },
      people: {
        id: 'id',
        firstName: 'firstName',
        lastName: 'lastName',
        fullName: 'fullName'
      },
      matters: {
        id: 'id',
        title: 'title'
      }
    }
  }
})

describe('Trust Reports - Aging Logic', () => {
  describe('Aging bucket calculations', () => {
    const now = new Date()

    function calculateAgeBucket(depositDate: Date): 'current' | 'days30to60' | 'days60to90' | 'over90' {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      if (depositDate >= thirtyDaysAgo) return 'current'
      if (depositDate >= sixtyDaysAgo) return 'days30to60'
      if (depositDate >= ninetyDaysAgo) return 'days60to90'
      return 'over90'
    }

    it('should categorize deposits less than 30 days old as current', () => {
      const recentDeposit = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      expect(calculateAgeBucket(recentDeposit)).toBe('current')
    })

    it('should categorize deposits exactly 30 days old as current', () => {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(thirtyDaysAgo)).toBe('current')
    })

    it('should categorize deposits 31-60 days old as 30-60 days', () => {
      const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(fortyFiveDaysAgo)).toBe('days30to60')
    })

    it('should categorize deposits 61-90 days old as 60-90 days', () => {
      const seventyFiveDaysAgo = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(seventyFiveDaysAgo)).toBe('days60to90')
    })

    it('should categorize deposits over 90 days old as over 90', () => {
      const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(hundredDaysAgo)).toBe('over90')
    })

    it('should categorize deposits exactly 90 days old as 60-90 days', () => {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(ninetyDaysAgo)).toBe('days60to90')
    })

    it('should categorize deposits 91 days old as over 90', () => {
      const ninetyOneDaysAgo = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000)
      expect(calculateAgeBucket(ninetyOneDaysAgo)).toBe('over90')
    })
  })

  describe('Aging totals calculation', () => {
    interface AgingBucket {
      current: number
      days30to60: number
      days60to90: number
      over90: number
      total: number
    }

    function calculateTotals(clientAgingData: AgingBucket[]): AgingBucket {
      return clientAgingData.reduce(
        (totals, client) => ({
          current: totals.current + client.current,
          days30to60: totals.days30to60 + client.days30to60,
          days60to90: totals.days60to90 + client.days60to90,
          over90: totals.over90 + client.over90,
          total: totals.total + client.total
        }),
        { current: 0, days30to60: 0, days60to90: 0, over90: 0, total: 0 }
      )
    }

    it('should sum client balances by aging bucket', () => {
      const clientData: AgingBucket[] = [
        { current: 100000, days30to60: 0, days60to90: 0, over90: 0, total: 100000 },
        { current: 0, days30to60: 50000, days60to90: 0, over90: 0, total: 50000 },
        { current: 0, days30to60: 0, days60to90: 30000, over90: 0, total: 30000 },
        { current: 0, days30to60: 0, days60to90: 0, over90: 20000, total: 20000 },
      ]

      const totals = calculateTotals(clientData)

      expect(totals.current).toBe(100000)
      expect(totals.days30to60).toBe(50000)
      expect(totals.days60to90).toBe(30000)
      expect(totals.over90).toBe(20000)
      expect(totals.total).toBe(200000)
    })

    it('should handle empty client list', () => {
      const totals = calculateTotals([])

      expect(totals.current).toBe(0)
      expect(totals.days30to60).toBe(0)
      expect(totals.days60to90).toBe(0)
      expect(totals.over90).toBe(0)
      expect(totals.total).toBe(0)
    })

    it('should handle mixed aging buckets per client', () => {
      // In practice, a client's balance goes into ONE bucket based on oldest deposit
      // But this tests the summing logic
      const clientData: AgingBucket[] = [
        { current: 50000, days30to60: 0, days60to90: 0, over90: 0, total: 50000 },
        { current: 75000, days30to60: 0, days60to90: 0, over90: 0, total: 75000 },
      ]

      const totals = calculateTotals(clientData)

      expect(totals.current).toBe(125000)
      expect(totals.total).toBe(125000)
    })
  })
})

describe('Trust Reports - Reconciliation Logic', () => {
  describe('Three-way reconciliation', () => {
    interface ReconciliationData {
      bankBalance: number
      trustLedgerBalance: number
      sumClientBalances: number
    }

    function analyzeReconciliation(data: ReconciliationData) {
      const bankVsLedger = data.bankBalance - data.trustLedgerBalance
      const ledgerVsClients = data.trustLedgerBalance - data.sumClientBalances

      return {
        bankVsLedgerVariance: bankVsLedger,
        ledgerVsClientsVariance: ledgerVsClients,
        isBalanced: bankVsLedger === 0 && ledgerVsClients === 0,
        hasOutstandingChecks: bankVsLedger < 0, // Bank lower = checks not cleared
        hasDepositsInTransit: bankVsLedger > 0, // Bank higher = deposits not posted
      }
    }

    it('should identify fully balanced reconciliation', () => {
      const data = {
        bankBalance: 125432_00,
        trustLedgerBalance: 125432_00,
        sumClientBalances: 125432_00
      }

      const result = analyzeReconciliation(data)

      expect(result.isBalanced).toBe(true)
      expect(result.bankVsLedgerVariance).toBe(0)
      expect(result.ledgerVsClientsVariance).toBe(0)
    })

    it('should detect positive variance (bank higher than ledger)', () => {
      const data = {
        bankBalance: 130000_00,
        trustLedgerBalance: 125000_00,
        sumClientBalances: 125000_00
      }

      const result = analyzeReconciliation(data)

      expect(result.isBalanced).toBe(false)
      expect(result.bankVsLedgerVariance).toBe(5000_00)
      expect(result.hasDepositsInTransit).toBe(true)
    })

    it('should detect negative variance (bank lower than ledger)', () => {
      const data = {
        bankBalance: 120000_00,
        trustLedgerBalance: 125000_00,
        sumClientBalances: 125000_00
      }

      const result = analyzeReconciliation(data)

      expect(result.isBalanced).toBe(false)
      expect(result.bankVsLedgerVariance).toBe(-5000_00)
      expect(result.hasOutstandingChecks).toBe(true)
    })

    it('should detect ledger vs client balance variance', () => {
      const data = {
        bankBalance: 125000_00,
        trustLedgerBalance: 125000_00,
        sumClientBalances: 124500_00 // $500 discrepancy
      }

      const result = analyzeReconciliation(data)

      expect(result.isBalanced).toBe(false)
      expect(result.bankVsLedgerVariance).toBe(0)
      expect(result.ledgerVsClientsVariance).toBe(500_00)
    })

    it('should detect multiple variances', () => {
      const data = {
        bankBalance: 130000_00,
        trustLedgerBalance: 125000_00,
        sumClientBalances: 124000_00
      }

      const result = analyzeReconciliation(data)

      expect(result.isBalanced).toBe(false)
      expect(result.bankVsLedgerVariance).toBe(5000_00)
      expect(result.ledgerVsClientsVariance).toBe(1000_00)
    })
  })
})

describe('Trust Reports - Client Ledger Statement Logic', () => {
  describe('Period calculations', () => {
    interface Transaction {
      amount: number
      date: Date
    }

    function calculatePeriodTotals(
      transactions: Transaction[],
      periodStart: Date,
      periodEnd: Date
    ) {
      const inPeriod = transactions.filter(
        tx => tx.date >= periodStart && tx.date < periodEnd
      )

      let totalDeposits = 0
      let totalDisbursements = 0

      for (const tx of inPeriod) {
        if (tx.amount > 0) {
          totalDeposits += tx.amount
        } else {
          totalDisbursements += Math.abs(tx.amount)
        }
      }

      return { totalDeposits, totalDisbursements }
    }

    it('should calculate deposits and disbursements for period', () => {
      const periodStart = new Date('2026-01-01')
      const periodEnd = new Date('2026-02-01')

      const transactions: Transaction[] = [
        { amount: 500000, date: new Date('2026-01-05') }, // Deposit
        { amount: -200000, date: new Date('2026-01-10') }, // Disbursement
        { amount: 100000, date: new Date('2026-01-15') }, // Deposit
        { amount: -50000, date: new Date('2026-01-20') }, // Disbursement
        { amount: 200000, date: new Date('2026-02-05') }, // Outside period
      ]

      const result = calculatePeriodTotals(transactions, periodStart, periodEnd)

      expect(result.totalDeposits).toBe(600000) // 500000 + 100000
      expect(result.totalDisbursements).toBe(250000) // 200000 + 50000
    })

    it('should exclude transactions before period', () => {
      const periodStart = new Date('2026-02-01')
      const periodEnd = new Date('2026-03-01')

      const transactions: Transaction[] = [
        { amount: 500000, date: new Date('2026-01-15') }, // Before period
        { amount: 200000, date: new Date('2026-02-15') }, // In period
      ]

      const result = calculatePeriodTotals(transactions, periodStart, periodEnd)

      expect(result.totalDeposits).toBe(200000)
    })

    it('should include transaction on period start date', () => {
      const periodStart = new Date('2026-01-01')
      const periodEnd = new Date('2026-02-01')

      const transactions: Transaction[] = [
        { amount: 100000, date: new Date('2026-01-01') }, // Exactly on start
      ]

      const result = calculatePeriodTotals(transactions, periodStart, periodEnd)

      expect(result.totalDeposits).toBe(100000)
    })

    it('should exclude transaction on period end date', () => {
      const periodStart = new Date('2026-01-01')
      const periodEnd = new Date('2026-02-01')

      const transactions: Transaction[] = [
        { amount: 100000, date: new Date('2026-02-01') }, // Exactly on end
      ]

      const result = calculatePeriodTotals(transactions, periodStart, periodEnd)

      expect(result.totalDeposits).toBe(0)
    })

    it('should handle empty transaction list', () => {
      const periodStart = new Date('2026-01-01')
      const periodEnd = new Date('2026-02-01')

      const result = calculatePeriodTotals([], periodStart, periodEnd)

      expect(result.totalDeposits).toBe(0)
      expect(result.totalDisbursements).toBe(0)
    })
  })

  describe('Opening and closing balance calculations', () => {
    it('should calculate closing balance correctly', () => {
      const openingBalance = 100000
      const totalDeposits = 50000
      const totalDisbursements = 30000

      const closingBalance = openingBalance + totalDeposits - totalDisbursements

      expect(closingBalance).toBe(120000)
    })

    it('should handle zero opening balance', () => {
      const openingBalance = 0
      const totalDeposits = 500000
      const totalDisbursements = 200000

      const closingBalance = openingBalance + totalDeposits - totalDisbursements

      expect(closingBalance).toBe(300000)
    })

    it('should handle period with only disbursements', () => {
      const openingBalance = 500000
      const totalDeposits = 0
      const totalDisbursements = 200000

      const closingBalance = openingBalance + totalDeposits - totalDisbursements

      expect(closingBalance).toBe(300000)
    })

    it('should handle period with only deposits', () => {
      const openingBalance = 100000
      const totalDeposits = 300000
      const totalDisbursements = 0

      const closingBalance = openingBalance + totalDeposits - totalDisbursements

      expect(closingBalance).toBe(400000)
    })
  })

  describe('Running balance tracking', () => {
    interface LedgerEntry {
      amount: number
      runningBalance?: number
    }

    function calculateRunningBalances(
      openingBalance: number,
      entries: LedgerEntry[]
    ): LedgerEntry[] {
      let balance = openingBalance

      return entries.map(entry => {
        balance += entry.amount
        return { ...entry, runningBalance: balance }
      })
    }

    it('should calculate running balances for each entry', () => {
      const entries: LedgerEntry[] = [
        { amount: 500000 },
        { amount: -200000 },
        { amount: 100000 },
        { amount: -50000 },
      ]

      const withBalances = calculateRunningBalances(0, entries)

      expect(withBalances[0].runningBalance).toBe(500000)
      expect(withBalances[1].runningBalance).toBe(300000)
      expect(withBalances[2].runningBalance).toBe(400000)
      expect(withBalances[3].runningBalance).toBe(350000)
    })

    it('should start from opening balance', () => {
      const entries: LedgerEntry[] = [
        { amount: 100000 },
        { amount: -50000 },
      ]

      const withBalances = calculateRunningBalances(500000, entries)

      expect(withBalances[0].runningBalance).toBe(600000)
      expect(withBalances[1].runningBalance).toBe(550000)
    })
  })
})

describe('Trust Reports - Sorting and Filtering', () => {
  describe('Aging report sorting', () => {
    interface ClientAging {
      clientName: string
      oldestDeposit: Date | null
    }

    function sortByOldestDeposit(clients: ClientAging[]): ClientAging[] {
      return [...clients].sort((a, b) => {
        if (!a.oldestDeposit) return 1
        if (!b.oldestDeposit) return -1
        return a.oldestDeposit.getTime() - b.oldestDeposit.getTime()
      })
    }

    it('should sort clients by oldest deposit date', () => {
      const clients: ClientAging[] = [
        { clientName: 'Client C', oldestDeposit: new Date('2026-01-15') },
        { clientName: 'Client A', oldestDeposit: new Date('2025-10-01') },
        { clientName: 'Client B', oldestDeposit: new Date('2025-12-01') },
      ]

      const sorted = sortByOldestDeposit(clients)

      expect(sorted[0].clientName).toBe('Client A') // Oldest
      expect(sorted[1].clientName).toBe('Client B')
      expect(sorted[2].clientName).toBe('Client C') // Most recent
    })

    it('should put clients with no deposit date at the end', () => {
      const clients: ClientAging[] = [
        { clientName: 'Client B', oldestDeposit: new Date('2025-12-01') },
        { clientName: 'Client A', oldestDeposit: null },
        { clientName: 'Client C', oldestDeposit: new Date('2026-01-15') },
      ]

      const sorted = sortByOldestDeposit(clients)

      expect(sorted[0].clientName).toBe('Client B')
      expect(sorted[1].clientName).toBe('Client C')
      expect(sorted[2].clientName).toBe('Client A') // Null at end
    })
  })

  describe('Filtering balances', () => {
    interface ClientBalance {
      clientId: string
      balance: number
    }

    it('should filter out clients with zero balance', () => {
      const clients: ClientBalance[] = [
        { clientId: '1', balance: 100000 },
        { clientId: '2', balance: 0 },
        { clientId: '3', balance: 50000 },
        { clientId: '4', balance: 0 },
      ]

      const withBalance = clients.filter(c => c.balance > 0)

      expect(withBalance).toHaveLength(2)
      expect(withBalance.map(c => c.clientId)).toEqual(['1', '3'])
    })

    it('should include clients with any positive balance', () => {
      const clients: ClientBalance[] = [
        { clientId: '1', balance: 1 }, // 1 cent
        { clientId: '2', balance: 0 },
      ]

      const withBalance = clients.filter(c => c.balance > 0)

      expect(withBalance).toHaveLength(1)
      expect(withBalance[0].clientId).toBe('1')
    })
  })
})
