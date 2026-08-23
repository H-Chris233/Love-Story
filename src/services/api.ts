import { put as putClientBlob } from '@vercel/blob/client'

import type {
  AnniversaryEntry,
  MemoryAsset,
  MemoryEntry,
  SessionView,
  Space,
  StoryView,
  Visibility
} from '@/types/domain'

interface ErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  if (response.status === 204) return undefined as T
  const body = (await response.json()) as { data: T } | ErrorBody
  if (!response.ok || 'error' in body) {
    const error = 'error' in body ? body.error : { code: 'REQUEST_FAILED', message: '请求失败' }
    if (response.status === 401) window.dispatchEvent(new Event('love-story:unauthorized'))
    throw new ApiError(error.code, error.message, response.status, error.fields)
  }
  return body.data
}

const json = (value: unknown) => JSON.stringify(value)

export const api = {
  status: () => request<{ initialized: boolean }>('/api/system/status'),
  publicStory: () => request<StoryView>('/api/public/story'),
  publicMemory: (slug: string) => request<MemoryEntry>(`/api/public/memories/${slug}`),
  publicAnniversary: (slug: string) =>
    request<AnniversaryEntry>(`/api/public/anniversaries/${slug}`),
  session: () => request<SessionView>('/api/auth/session'),
  bootstrap: (input: {
    storyTitle: string
    relationshipStartedAt: string
    displayName: string
    email: string
    password: string
    partnerEmail: string
  }) =>
    request<SessionView & { invitationDelivery: 'sent' | 'failed' }>('/api/auth/bootstrap', {
      method: 'POST',
      body: json(input)
    }),
  login: (input: { email: string; password: string }) =>
    request<SessionView>('/api/auth/login', { method: 'POST', body: json(input) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  acceptInvitation: (input: { token: string; displayName: string; password: string }) =>
    request<SessionView>('/api/auth/invitations/accept', {
      method: 'POST',
      body: json(input)
    }),
  invitePartner: (partnerEmail: string) =>
    request<{ invitationDelivery: 'sent' | 'failed' }>('/api/auth/invitations', {
      method: 'POST',
      body: json({ partnerEmail })
    }),
  forgotPassword: (email: string) =>
    request<{ accepted: true }>('/api/auth/forgot-password', {
      method: 'POST',
      body: json({ email })
    }),
  resetPassword: (token: string, password: string) =>
    request<void>('/api/auth/reset-password', {
      method: 'POST',
      body: json({ token, password })
    }),
  story: () => request<StoryView>('/api/story'),
  updateSettings: (patch: Partial<Pick<Space, 'title' | 'intro' | 'relationshipStartedAt'>>) =>
    request<Space>('/api/story/settings', { method: 'PATCH', body: json(patch) }),
  memories: () => request<MemoryEntry[]>('/api/memories'),
  createMemory: (input: {
    title: string
    body: string
    occurredOn: string
    visibility?: Visibility
  }) => request<MemoryEntry>('/api/memories', { method: 'POST', body: json(input) }),
  updateMemory: (
    id: string,
    patch: Partial<Pick<MemoryEntry, 'title' | 'body' | 'occurredOn' | 'visibility'>>
  ) => request<MemoryEntry>(`/api/memories/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteMemory: (id: string) => request<void>(`/api/memories/${id}`, { method: 'DELETE' }),
  uploadMemoryImage: async (memoryId: string, file: File): Promise<MemoryAsset> => {
    const upload = await request<{ pathname: string; clientToken: string }>(
      '/api/media/upload-token',
      {
        method: 'POST',
        body: json({ memoryId, declaredType: file.type })
      }
    )
    await putClientBlob(upload.pathname, file, {
      access: 'private',
      token: upload.clientToken,
      contentType: file.type
    })
    return request<MemoryAsset>('/api/media/complete', {
      method: 'POST',
      body: json({
        memoryId,
        pathname: upload.pathname,
        fileName: file.name,
        declaredType: file.type
      })
    })
  },
  deleteAsset: (id: string) => request<void>(`/api/media/${id}`, { method: 'DELETE' }),
  anniversaries: () => request<AnniversaryEntry[]>('/api/anniversaries'),
  createAnniversary: (input: {
    title: string
    originalDate: string
    reminderDays?: number
    visibility?: Visibility
  }) => request<AnniversaryEntry>('/api/anniversaries', { method: 'POST', body: json(input) }),
  updateAnniversary: (
    id: string,
    patch: Partial<Pick<AnniversaryEntry, 'title' | 'originalDate' | 'reminderDays' | 'visibility'>>
  ) =>
    request<AnniversaryEntry>(`/api/anniversaries/${id}`, {
      method: 'PATCH',
      body: json(patch)
    }),
  deleteAnniversary: (id: string) => request<void>(`/api/anniversaries/${id}`, { method: 'DELETE' })
}
