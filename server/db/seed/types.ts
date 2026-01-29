import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { schema } from '../index'

export type SeedDb = DrizzleD1Database<typeof schema>

export interface SeedDates {
  now: Date
  oneWeekAgo: Date
  twoWeeksAgo: Date
  oneMonthAgo: Date
  twoMonthsAgo: Date
  threeMonthsAgo: Date
}

export interface SeedUserIds {
  adminId: string
  lawyerId: string
  lawyer2Id: string
  staffId: string
  advisorId: string
  client1Id: string
  client2Id: string
  client3Id: string
}

export interface SeedClientIds {
  janeClientId: string
  michaelClientId: string
  sarahClientId: string
  janeDoePersonId: string
  michaelJohnsonPersonId: string
  sarahWilliamsPersonId: string
}

export interface SeedTemplateIds {
  folderId: string
  template1Id: string
  template2Id: string
  template3Id: string
  engagementHtml: string
  trustHtml: string
  engagementDocxBuffer: ArrayBuffer | null
  trustDocxBuffer: ArrayBuffer | null
}

export interface SeedServiceIds {
  service1Id: string
  service2Id: string
  service3Id: string
}

export interface SeedMatterIds {
  matter1Id: string
  matter2Id: string
  matter3Id: string
}

export interface SeedJourneyIds {
  journeyId: string
  step1Id: string
  step2Id: string
  step3Id: string
  step4Id: string
  step5Id: string
  step6Id: string
  step7Id: string
  clientJourney1Id: string
  clientJourney2Id: string
  clientJourney3Id: string
}
