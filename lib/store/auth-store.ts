import type { Member, SessionView, Space } from '../types.js'

export interface BootstrapRecord {
  username: string
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
  findLoginCredentials(identifier: string): Promise<{ userId: string; passwordHash: string } | null>
  updateUsername(userId: string, username: string): Promise<void>
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
    username: string
    email: string
    tokenHash: string
    displayName: string
    passwordHash: string
    now: Date
  }): Promise<{ space: Space; user: Member }>
}
