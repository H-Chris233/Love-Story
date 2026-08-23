import { describe, expect, it } from 'vitest'

import { createStoryService } from '../lib/story.js'
import { createMemoryStore } from '../lib/store/memory.js'

describe('StoryService', () => {
  it('keeps new memories private until either member publishes them', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    const partner = store.addPartnerForTest(owner.space.id, {
      displayName: '阿川',
      email: 'partner@example.com'
    })
    const story = createStoryService({
      store,
      now: () => new Date('2026-08-23T00:00:00.000Z')
    })

    const memory = await story.createMemory(owner.user, owner.space, {
      title: '海边的第一张合照',
      body: '风很大，我们笑得也很大声。',
      occurredOn: '2025-05-20'
    })
    expect(memory.visibility).toBe('private')
    expect((await story.getPublicStory()).memories).toHaveLength(0)

    await story.updateMemory(partner, owner.space, memory.id, { visibility: 'public' })
    expect((await story.getPublicStory()).memories).toEqual([
      expect.objectContaining({ id: memory.id, visibility: 'public' })
    ])
  })

  it('removes a published memory from its stable public URL when made private', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    const story = createStoryService({ store })
    const memory = await story.createMemory(owner.user, owner.space, {
      title: '落日',
      body: '一起看海。',
      occurredOn: '2025-05-20',
      visibility: 'public'
    })

    expect((await story.getPublicMemory(memory.slug)).id).toBe(memory.id)
    await story.updateMemory(owner.user, owner.space, memory.id, { visibility: 'private' })
    await expect(story.getPublicMemory(memory.slug)).rejects.toMatchObject({
      code: 'MEMORY_NOT_FOUND',
      status: 404
    })
  })

  it('keeps anniversaries private by default and lets either member publish them', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    const partner = store.addPartnerForTest(owner.space.id, {
      displayName: '阿川',
      email: 'partner@example.com'
    })
    const story = createStoryService({ store })

    const anniversary = await story.createAnniversary(owner.user, owner.space, {
      title: '在一起',
      originalDate: '2024-01-13'
    })
    expect(anniversary.visibility).toBe('private')

    await story.updateAnniversary(partner, owner.space, anniversary.id, {
      visibility: 'public'
    })
    expect((await story.getPublicStory()).anniversaries).toHaveLength(1)
    expect((await story.getPublicAnniversary(anniversary.slug)).id).toBe(anniversary.id)
    await story.updateAnniversary(owner.user, owner.space, anniversary.id, {
      visibility: 'private'
    })
    await expect(story.getPublicAnniversary(anniversary.slug)).rejects.toMatchObject({
      status: 404
    })
  })

  it('rejects impossible calendar dates at the domain boundary', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    const story = createStoryService({ store })

    await expect(
      story.createMemory(owner.user, owner.space, {
        title: '不存在的一天',
        body: '日期应该在写库之前被拒绝。',
        occurredOn: '2025-02-30'
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
