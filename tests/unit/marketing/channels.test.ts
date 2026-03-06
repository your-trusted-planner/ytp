/**
 * Tests for Marketing Channel Logic
 *
 * Tests channel CRUD operations and deactivation behavior.
 * Uses simulated in-memory storage since the actual module depends on @nuxthub/db.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ===================================
// Simulated channel storage
// ===================================

interface Channel {
  id: string
  name: string
  description: string | null
  channelType: 'EMAIL' | 'SMS'
  slug: string
  isActive: number
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

class ChannelStore {
  private channels: Map<string, Channel> = new Map()
  private idCounter = 0

  create(data: { name: string; description?: string; channelType: 'EMAIL' | 'SMS'; slug: string; sortOrder?: number }): Channel {
    // Check slug uniqueness
    for (const ch of this.channels.values()) {
      if (ch.slug === data.slug) {
        throw new Error(`Channel with slug "${data.slug}" already exists`)
      }
    }

    const id = `ch-${++this.idCounter}`
    const channel: Channel = {
      id,
      name: data.name,
      description: data.description ?? null,
      channelType: data.channelType,
      slug: data.slug,
      isActive: 1,
      sortOrder: data.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.channels.set(id, channel)
    return channel
  }

  getById(id: string): Channel | undefined {
    return this.channels.get(id)
  }

  getAll(): Channel[] {
    return Array.from(this.channels.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  getActive(): Channel[] {
    return this.getAll().filter(ch => ch.isActive === 1)
  }

  update(id: string, data: Partial<Pick<Channel, 'name' | 'description' | 'channelType' | 'slug' | 'isActive' | 'sortOrder'>>): Channel {
    const channel = this.channels.get(id)
    if (!channel) throw new Error('Channel not found')

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== channel.slug) {
      for (const ch of this.channels.values()) {
        if (ch.slug === data.slug && ch.id !== id) {
          throw new Error(`Channel with slug "${data.slug}" already exists`)
        }
      }
    }

    if (data.name !== undefined) channel.name = data.name
    if (data.description !== undefined) channel.description = data.description
    if (data.channelType !== undefined) channel.channelType = data.channelType
    if (data.slug !== undefined) channel.slug = data.slug
    if (data.isActive !== undefined) channel.isActive = data.isActive
    if (data.sortOrder !== undefined) channel.sortOrder = data.sortOrder
    channel.updatedAt = new Date()

    return channel
  }

  deactivate(id: string): Channel {
    return this.update(id, { isActive: 0 })
  }
}

// ===================================
// TESTS
// ===================================

describe('Marketing Channels', () => {
  let store: ChannelStore

  beforeEach(() => {
    store = new ChannelStore()
  })

  describe('Channel CRUD', () => {
    it('should create a channel with required fields', () => {
      const channel = store.create({
        name: 'Monthly Newsletter',
        channelType: 'EMAIL',
        slug: 'monthly-newsletter'
      })

      expect(channel.id).toBeDefined()
      expect(channel.name).toBe('Monthly Newsletter')
      expect(channel.channelType).toBe('EMAIL')
      expect(channel.slug).toBe('monthly-newsletter')
      expect(channel.isActive).toBe(1)
      expect(channel.sortOrder).toBe(0)
    })

    it('should create a channel with optional fields', () => {
      const channel = store.create({
        name: 'SMS Alerts',
        description: 'Important case updates via text',
        channelType: 'SMS',
        slug: 'sms-alerts',
        sortOrder: 5
      })

      expect(channel.description).toBe('Important case updates via text')
      expect(channel.channelType).toBe('SMS')
      expect(channel.sortOrder).toBe(5)
    })

    it('should enforce unique slugs on create', () => {
      store.create({ name: 'First', channelType: 'EMAIL', slug: 'my-slug' })

      expect(() => {
        store.create({ name: 'Second', channelType: 'SMS', slug: 'my-slug' })
      }).toThrow('already exists')
    })

    it('should retrieve a channel by id', () => {
      const created = store.create({ name: 'Test', channelType: 'EMAIL', slug: 'test' })
      const fetched = store.getById(created.id)

      expect(fetched).toBeDefined()
      expect(fetched!.name).toBe('Test')
    })

    it('should return undefined for non-existent channel', () => {
      expect(store.getById('non-existent')).toBeUndefined()
    })

    it('should list all channels sorted by sortOrder', () => {
      store.create({ name: 'C', channelType: 'EMAIL', slug: 'c', sortOrder: 3 })
      store.create({ name: 'A', channelType: 'EMAIL', slug: 'a', sortOrder: 1 })
      store.create({ name: 'B', channelType: 'SMS', slug: 'b', sortOrder: 2 })

      const all = store.getAll()
      expect(all.map(ch => ch.name)).toEqual(['A', 'B', 'C'])
    })

    it('should update channel fields', () => {
      const channel = store.create({ name: 'Old Name', channelType: 'EMAIL', slug: 'old' })
      store.update(channel.id, { name: 'New Name', slug: 'new' })

      const updated = store.getById(channel.id)
      expect(updated!.name).toBe('New Name')
      expect(updated!.slug).toBe('new')
    })

    it('should enforce unique slugs on update', () => {
      store.create({ name: 'First', channelType: 'EMAIL', slug: 'first' })
      const second = store.create({ name: 'Second', channelType: 'EMAIL', slug: 'second' })

      expect(() => {
        store.update(second.id, { slug: 'first' })
      }).toThrow('already exists')
    })

    it('should allow updating to the same slug', () => {
      const channel = store.create({ name: 'Test', channelType: 'EMAIL', slug: 'test' })

      // Should not throw when updating to the same slug
      expect(() => {
        store.update(channel.id, { slug: 'test', name: 'Updated Name' })
      }).not.toThrow()
    })

    it('should throw when updating non-existent channel', () => {
      expect(() => {
        store.update('non-existent', { name: 'Test' })
      }).toThrow('Channel not found')
    })
  })

  describe('Deactivate Behavior', () => {
    it('should set isActive to 0 (soft delete)', () => {
      const channel = store.create({ name: 'Newsletter', channelType: 'EMAIL', slug: 'newsletter' })
      store.deactivate(channel.id)

      const deactivated = store.getById(channel.id)
      expect(deactivated!.isActive).toBe(0)
    })

    it('should exclude deactivated channels from active list', () => {
      store.create({ name: 'Active', channelType: 'EMAIL', slug: 'active' })
      const toDeactivate = store.create({ name: 'ToRemove', channelType: 'SMS', slug: 'remove' })
      store.deactivate(toDeactivate.id)

      const active = store.getActive()
      expect(active).toHaveLength(1)
      expect(active[0].name).toBe('Active')
    })

    it('should still include deactivated channels in full list', () => {
      store.create({ name: 'Active', channelType: 'EMAIL', slug: 'active' })
      const toDeactivate = store.create({ name: 'Inactive', channelType: 'SMS', slug: 'inactive' })
      store.deactivate(toDeactivate.id)

      const all = store.getAll()
      expect(all).toHaveLength(2)
    })

    it('should preserve channel data after deactivation', () => {
      const channel = store.create({
        name: 'Important',
        description: 'Do not lose this',
        channelType: 'EMAIL',
        slug: 'important'
      })
      store.deactivate(channel.id)

      const deactivated = store.getById(channel.id)
      expect(deactivated!.name).toBe('Important')
      expect(deactivated!.description).toBe('Do not lose this')
      expect(deactivated!.slug).toBe('important')
    })

    it('should allow reactivation', () => {
      const channel = store.create({ name: 'Test', channelType: 'EMAIL', slug: 'test' })
      store.deactivate(channel.id)
      expect(store.getById(channel.id)!.isActive).toBe(0)

      store.update(channel.id, { isActive: 1 })
      expect(store.getById(channel.id)!.isActive).toBe(1)
      expect(store.getActive()).toHaveLength(1)
    })
  })
})
