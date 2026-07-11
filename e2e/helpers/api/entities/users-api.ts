import type { TestUser, UserResponse } from '../../../data/users';
import { ensureAuthDir, storageStatePath, writeTestContext, type TestContext } from '../../../setup/test-context';
import { API_PREFIX, newApiContext } from '../client';
import { expectOk } from '../../assertions/status';
import { updateUserRole } from '../../db';

export function buildUsers(runId: string): TestUser[] {
  return [
    { key: 'primaryUser', role: 'User', username: `${runId}-primary-user`, email: `${runId}-primary-user@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('primaryUser') },
    { key: 'secondaryUser', role: 'User', username: `${runId}-secondary-user`, email: `${runId}-secondary-user@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('secondaryUser') },
    { key: 'writer', role: 'Writer', username: `${runId}-writer`, email: `${runId}-writer@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('writer') },
    { key: 'secondaryWriter', role: 'Writer', username: `${runId}-secondary-writer`, email: `${runId}-secondary-writer@e2e.local`, password: 'Password123', storageStatePath: storageStatePath('secondaryWriter') },
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

export async function signupWithStorage(user: TestUser): Promise<{ response: import('@playwright/test').APIResponse; api: import('@playwright/test').APIRequestContext }> {
  const api = await newApiContext();
  const response = await api.post(`${API_PREFIX}/auth/signup`, {
    data: {
      username: user.username,
      email: user.email,
      password: user.password,
    },
  });

  return { response, api };
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
