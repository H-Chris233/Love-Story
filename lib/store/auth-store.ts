import type { Member, SessionView, Space } from '../types.js'

export interface BootstrapRecord {
  storyTitle: string
  relationshipStartedAt: string
  displayName: string
  email: string
  passwordHash: string
  now: Date
}

export interface InvitationRecord {
  spaceId: string
  invitedBy: string
  email: string
  tokenHash: string
  expiresAt: Date
  now: Date
}

export interface AuthStore {
  isSetup(): Promise<boolean>
  hasSecondMember(spaceId: string): Promise<boolean>
  bootstrap(input: BootstrapRecord): Promise<{ space: Space; user: Member }>
  createSession(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void>
  findSession(tokenHash: string, now: Date): Promise<SessionView | null>
  findCredentials(email: string): Promise<{ userId: string; passwordHash: string } | null>
  deleteSession(tokenHash: string): Promise<void>
  createPasswordReset(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void>
  consumePasswordReset(input: { tokenHash: string; passwordHash: string; now: Date }): Promise<void>
  createInvitation(input: InvitationRecord): Promise<void>
  acceptInvitation(input: {
    tokenHash: string
    displayName: string
    passwordHash: string
    now: Date
  }): Promise<{ space: Space; user: Member }>
}
