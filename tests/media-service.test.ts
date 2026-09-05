import { describe, expect, it } from 'vitest'

import { createMediaService } from '../lib/media.js'
import { createMemoryStore } from '../lib/store/memory.js'
import { createMemoryBlobStorage } from '../lib/testing/memory-blob.js'

async function createStoryWithMemory() {
  const store = createMemoryStore()
  const owner = await store.bootstrap({
    storyTitle: '我们的山海日记',
    relationshipStartedAt: '2024-01-13T14:28:46.000Z',
    displayName: '小夏',
    email: 'owner@example.com',
    passwordHash: 'unused',
    now: new Date('2026-08-23T00:00:00.000Z')
  })
  const memory = await store.createMemory({
    space: owner.space,
    author: owner.user,
    title: '落日',
    body: '一起看海。',
    occurredOn: '2025-05-20',
    visibility: 'private',
    slug: '2025-05-20-sunset',
    now: new Date('2026-08-23T00:00:00.000Z')
  })
  return { store, owner, memory }
}

describe('MediaService', () => {
  it('enforces byte and count limits and allows replacement after deleting a photo', async () => {
    const { store, owner, memory } = await createStoryWithMemory()
    const blob = createMemoryBlobStorage()
    const media = createMediaService({ store, blob })
    const bytes = new Uint8Array(5 * 1024 * 1024)
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
    const file = { name: 'limit.png', declaredType: 'image/png', bytes }
    const first = await media.upload(owner.user, owner.space, memory.id, file)
    await expect(
      media.upload(owner.user, owner.space, memory.id, {
        ...file,
        bytes: new Uint8Array(5 * 1024 * 1024 + 1)
      })
    ).rejects.toMatchObject({ status: 413 })
    for (let i = 1; i < 10; i++)
      await media.upload(owner.user, owner.space, memory.id, { ...file, bytes: bytes.slice(0, 8) })
    await expect(media.upload(owner.user, owner.space, memory.id, file)).rejects.toMatchObject({
      code: 'TOO_MANY_IMAGES'
    })
    await media.delete(owner.user, owner.space, first.id)
    expect(blob.objects.size).toBe(9)
    await media.upload(owner.user, owner.space, memory.id, file)
    expect(await store.countAssets(memory.id)).toBe(10)
    await media.deleteMemory(owner.user, owner.space, memory.id)
    expect(blob.objects.size).toBe(0)
  })
  it('accepts signed image bytes and keeps private media behind membership', async () => {
    const { store, owner, memory } = await createStoryWithMemory()
    const blob = createMemoryBlobStorage()
    const media = createMediaService({ store, blob })
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])

    const asset = await media.upload(owner.user, owner.space, memory.id, {
      name: '海边.png',
      declaredType: 'image/png',
      bytes: png
    })

    await expect(media.read(asset.id)).rejects.toMatchObject({ status: 404 })
    await expect(media.read(asset.id, owner.user)).resolves.toMatchObject({
      contentType: 'image/png',
      bytes: png
    })
    await store.updateMemory(owner.space.id, memory.id, { visibility: 'public' }, new Date())
    await expect(media.read(asset.id)).resolves.toMatchObject({ contentType: 'image/png' })
  })

  it('rejects spoofed images and compensates a failed metadata write', async () => {
    const { store, owner, memory } = await createStoryWithMemory()
    const blob = createMemoryBlobStorage()
    const media = createMediaService({ store, blob })
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    await expect(
      media.upload(owner.user, owner.space, memory.id, {
        name: '伪装.png',
        declaredType: 'image/png',
        bytes: svg
      })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE' })

    store.failNextAssetWriteForTest()
    await expect(
      media.upload(owner.user, owner.space, memory.id, {
        name: '海边.gif',
        declaredType: 'image/gif',
        bytes: new TextEncoder().encode('GIF89a-content')
      })
    ).rejects.toThrow('metadata write failed')
    expect(blob.objects.size).toBe(0)
  })

  it('verifies a direct private Blob upload before exposing it and completes idempotently', async () => {
    const { store, owner, memory } = await createStoryWithMemory()
    const blob = createMemoryBlobStorage()
    const media = createMediaService({ store, blob })
    const pathname = `memories/${memory.id}/direct.png`
    blob.objects.set(pathname, {
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]),
      contentType: 'image/png'
    })

    const [first, repeated] = await Promise.all(
      [1, 2].map(() =>
        media.completeClientUpload(owner.user, owner.space, memory.id, {
          pathname,
          name: '直传.png',
          declaredType: 'image/png'
        })
      )
    )

    expect(repeated.id).toBe(first.id)
    expect(await store.countAssets(memory.id)).toBe(1)
    expect(blob.objects.has(pathname)).toBe(true)
  })
})
