import type { TestUser, UserResponse } from '../../../data/users';
import { ensureAuthDir, storageStatePath, writeTestContext, type TestContext } from '../../../setup/test-context';
import { API_PREFIX, expectOk, newApiContext } from '..';
import { updateUserRole } from '../../db';

export const userKeys = ['userA', 'userB', 'writerA', 'writerB', 'admin'] as const;

export function buildUsers(runId: string): TestUser[] {
  return [
    { key: 'userA', role: 'User', username: `${runId}-user-a`, email: `${runId}-user-a@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('userA') },
    { key: 'userB', role: 'User', username: `${runId}-user-b`, email: `${runId}-user-b@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('userB') },
    { key: 'writerA', role: 'Writer', username: `${runId}-writer-a`, email: `${runId}-writer-a@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('writerA') },
    { key: 'writerB', role: 'Writer', username: `${runId}-writer-b`, email: `${runId}-writer-b@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('writerB') },
    { key: 'admin', role: 'Admin', username: `${runId}-admin`, email: `${runId}-admin@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('admin') },
  ];
}

export async function signup(user: TestUser): Promise<UserResponse> {
  const api = await newApiContext();

  try {
    const response = await api.post(`${API_PREFIX}/auth/signup`, {
      data: {
        username: user.username,
        email: user.email,
        password: user.password,
      },
    });
    await expectOk(response);
    return (await response.json()) as UserResponse;
  } finally {
    await api.dispose();
  }
}

export async function signInAndSaveStorage(user: TestUser): Promise<UserResponse> {
  const api = await newApiContext();

  try {
    const response = await api.post(`${API_PREFIX}/auth/signin`, {
      data: {
        email: user.email,
        password: user.password,
      },
    });
    await expectOk(response);
    await api.storageState({ path: user.storageStatePath });
    return (await response.json()) as UserResponse;
  } finally {
    await api.dispose();
  }
}

export async function createRoleUsers(runId: string): Promise<TestContext> {
  await ensureAuthDir();

  const users = buildUsers(runId);
  const contextUsers = {} as TestContext['users'];

  for (const user of users) {
    const created = await signup(user);

    if (user.role !== 'User') {
      updateUserRole(user.email, user.role);
    }

    const signedIn = await signInAndSaveStorage(user);
    contextUsers[user.key] = {
      ...user,
      id: signedIn.id ?? created.id,
    };
  }

  const context: TestContext = { runId, users: contextUsers };
  await writeTestContext(context);
  return context;
}
