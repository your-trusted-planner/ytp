/**
 * Lawmatics Test Fixtures
 *
 * Provides typed access to fixture data for testing Lawmatics import functionality.
 * Fixtures represent realistic Lawmatics API responses including edge cases.
 */

import type {
  LawmaticsUser,
  LawmaticsContact,
  LawmaticsProspect,
  LawmaticsNote,
  LawmaticsActivity,
  LawmaticsResponse
} from '../../../server/utils/lawmatics-client'

// Import JSON fixtures
import usersJson from './users.json'
import contactsJson from './contacts.json'
import contactsPage1Json from './contacts-page1.json'
import contactsPage2Json from './contacts-page2.json'
import contactsPage3Json from './contacts-page3.json'
import contactsEmptyJson from './contacts-empty.json'
import prospectsJson from './prospects.json'
import notesJson from './notes.json'
import activitiesJson from './activities.json'
import error401Json from './errors/401.json'
import error429Json from './errors/429.json'
import error500Json from './errors/500.json'

// Type the fixtures
export const usersFixture = usersJson as LawmaticsResponse<LawmaticsUser>
export const contactsFixture = contactsJson as LawmaticsResponse<LawmaticsContact>
export const contactsPage1Fixture = contactsPage1Json as LawmaticsResponse<LawmaticsContact>
export const contactsPage2Fixture = contactsPage2Json as LawmaticsResponse<LawmaticsContact>
export const contactsPage3Fixture = contactsPage3Json as LawmaticsResponse<LawmaticsContact>
export const contactsEmptyFixture = contactsEmptyJson as LawmaticsResponse<LawmaticsContact>
export const prospectsFixture = prospectsJson as LawmaticsResponse<LawmaticsProspect>
export const notesFixture = notesJson as LawmaticsResponse<LawmaticsNote>
export const activitiesFixture = activitiesJson as LawmaticsResponse<LawmaticsActivity>

// Error response fixtures
export const error401Fixture = error401Json
export const error429Fixture = error429Json
export const error500Fixture = error500Json

/**
 * Get paginated contacts fixture by page number
 */
export function getContactsPage(page: number): LawmaticsResponse<LawmaticsContact> {
  switch (page) {
    case 1:
      return contactsPage1Fixture
    case 2:
      return contactsPage2Fixture
    case 3:
      return contactsPage3Fixture
    default:
      return contactsEmptyFixture
  }
}

/**
 * Fixture metadata for testing
 */
export const fixtureMetadata = {
  users: {
    count: usersFixture.data.length,
    activeCount: usersFixture.data.filter(u => u.attributes.active).length,
    ids: usersFixture.data.map(u => u.id)
  },
  contacts: {
    count: contactsFixture.data.length,
    personCount: contactsFixture.data.filter(c =>
      c.attributes.contact_type === 'Individual'
    ).length,
    nonPersonCount: contactsFixture.data.filter(c =>
      c.attributes.contact_type !== 'Individual'
    ).length,
    duplicateEmails: ['john.smith@email.com'], // Known duplicate
    unicodeContacts: ['lm-contact-005'],
    ids: contactsFixture.data.map(c => c.id)
  },
  prospects: {
    count: prospectsFixture.data.length,
    activeCount: prospectsFixture.data.filter(p => p.attributes.status === 'active').length,
    withContactCount: prospectsFixture.data.filter(p =>
      p.relationships?.contact?.data
    ).length,
    orphanCount: prospectsFixture.data.filter(p =>
      !p.relationships?.contact?.data
    ).length,
    ids: prospectsFixture.data.map(p => p.id)
  },
  notes: {
    count: notesFixture.data.length,
    withProspectCount: notesFixture.data.filter(n =>
      n.relationships?.prospect?.data
    ).length,
    withContactCount: notesFixture.data.filter(n =>
      n.relationships?.contact?.data
    ).length,
    ids: notesFixture.data.map(n => n.id)
  },
  activities: {
    count: activitiesFixture.data.length,
    types: [...new Set(activitiesFixture.data.map(a => a.type))],
    ids: activitiesFixture.data.map(a => a.id)
  },
  pagination: {
    totalPages: 3,
    perPage: 3,
    totalCount: 7
  }
}

/**
 * Helper to create a modified fixture for testing specific scenarios
 */
export function createModifiedContactFixture(
  modifications: Partial<LawmaticsContact['attributes']>
): LawmaticsContact {
  const base = contactsFixture.data[0]!
  return {
    ...base,
    id: `lm-contact-modified-${Date.now()}`,
    attributes: {
      ...base.attributes,
      ...modifications
    }
  }
}

/**
 * Helper to create a custom pagination response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  perPage: number,
  totalCount: number
): LawmaticsResponse<T> {
  return {
    data,
    meta: {
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / perPage),
        total_count: totalCount,
        per_page: perPage
      }
    }
  }
}
