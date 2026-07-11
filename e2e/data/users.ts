export type Role = 'User' | 'Writer' | 'Admin';

export interface TestUser {
  key: 'primaryUser' | 'secondaryUser' | 'writer' | 'secondaryWriter' | 'admin';
  username: string;
  email: string;
  password: string;
  role: Role;
  storageStatePath: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatar?: string;
  nowReading?: string;
  nowWatch?: string;
  nowListening?: string;
  nowBeingIn?: string;
}

export function uniqueUser(runId: string, label: string): Omit<TestUser, 'key' | 'role' | 'storageStatePath'> {
  const safeLabel = label.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-');
  const suffix = Date.now().toString(36);
  const safeRunId = runId.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-');
  const username = `${safeRunId}-${safeLabel}-${suffix}`.slice(0, 50).replace(/-+$/g, '');
  const emailLocalPart = `${safeRunId}-${safeLabel}-${suffix}`.slice(0, 60).replace(/-+$/g, '');

  return {
    username,
    email: `${emailLocalPart}@e2e.local`,
    password: 'Password123',
  };
}

export const invalidSignupUsers = {
  malformedEmail: { username: 'invalid-email', email: 'not-an-email', password: 'Password123' },
  emptyUsername: { username: '', email: 'empty-username@e2e.local', password: 'Password123' },
  shortPassword: { username: 'short-password', email: 'short-password@e2e.local', password: 'Pw1' },
  weakPassword: { username: 'weak-password', email: 'weak-password@e2e.local', password: 'password' },
};
