import { test, expect } from '../../fixtures/test';
import { API_PREFIX, newApiContext } from '../../helpers/api/client';
import { expectNoPassword, expectStatus } from '../../helpers/assertions/status';
import { updateUserRole } from '../../helpers/db';
import { uniqueUser } from '../../data/users';

async function createSignedInUser(runId: string, label: string) {
  const user = uniqueUser(runId, label);
  const api = await newApiContext();

  const signup = await api.post(`${API_PREFIX}/auth/signup`, { data: user });
  await expectStatus(signup, 201);
  const created = await signup.json();

  return { api, user, created };
}

test.describe('users api', () => {
  test('GET /users/me returns self for user, writer, and admin', async ({ app, primaryUserApi, writerApi, adminApi }) => {
    for (const [api, user] of [
      [primaryUserApi, app.users.primaryUser],
      [writerApi, app.users.writer],
      [adminApi, app.users.admin],
    ] as const) {
      const response = await api.get(`${API_PREFIX}/users/me`);
      await expectStatus(response, 200);
      expect(await response.json()).toMatchObject({ id: user.id, email: user.email, role: user.role });
    }
  });

  test('PATCH /users/me updates username', async ({ app }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-update-username');

    try {
      const username = `${app.runId}-renamed-user`;
      const response = await api.patch(`${API_PREFIX}/users/me`, { data: { username } });
      await expectStatus(response, 200);
      expect(await response.json()).toMatchObject({ id: created.id, username });
    } finally {
      await api.dispose();
    }
  });

  test('PATCH /users/me updates avatar', async ({ app }) => {
    const { api } = await createSignedInUser(app.runId, 'users-update-avatar');

    try {
      const avatar = 'https://example.com/avatar.png';
      const response = await api.patch(`${API_PREFIX}/users/me`, { data: { avatar } });
      await expectStatus(response, 200);
      expect(await response.json()).toMatchObject({ avatar });
    } finally {
      await api.dispose();
    }
  });

  test('PATCH /users/me updates current activity fields', async ({ app }) => {
    const { api } = await createSignedInUser(app.runId, 'users-update-activity');

    try {
      const update = {
        nowReading: `${app.runId} book`,
        nowWatch: `${app.runId} show`,
        nowListening: `${app.runId} album`,
        nowBeingIn: `${app.runId} city`,
      };
      const response = await api.patch(`${API_PREFIX}/users/me`, { data: update });
      await expectStatus(response, 200);
      expect(await response.json()).toMatchObject(update);
    } finally {
      await api.dispose();
    }
  });

  test('PATCH /users/me rejects unknown fields', async ({ primaryUserApi }) => {
    const response = await primaryUserApi.patch(`${API_PREFIX}/users/me`, { data: { unknownField: 'value' } });
    await expectStatus(response, 400);
  });

  test('PATCH /users/me/password changes own password', async ({ app }) => {
    const { api, user } = await createSignedInUser(app.runId, 'users-password-change');

    try {
      const response = await api.patch(`${API_PREFIX}/users/me/password`, {
        data: {
          currentPassword: user.password,
          newPassword: 'NewPassword123',
        },
      });
      await expectStatus(response, 204);

      const oldPasswordApi = await newApiContext();
      const newPasswordApi = await newApiContext();
      try {
        await expectStatus(await oldPasswordApi.post(`${API_PREFIX}/auth/signin`, { data: { email: user.email, password: user.password } }), 401);
        await expectStatus(await newPasswordApi.post(`${API_PREFIX}/auth/signin`, { data: { email: user.email, password: 'NewPassword123' } }), 200);
      } finally {
        await oldPasswordApi.dispose();
        await newPasswordApi.dispose();
      }
    } finally {
      await api.dispose();
    }
  });

  test('PATCH /users/me/password rejects wrong currentPassword', async ({ primaryUserApi }) => {
    const response = await primaryUserApi.patch(`${API_PREFIX}/users/me/password`, {
      data: {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword123',
      },
    });
    await expectStatus(response, 401);
  });

  test('PATCH /users/me/password rejects weak newPassword', async ({ app }) => {
    const { api, user } = await createSignedInUser(app.runId, 'users-weak-password');

    try {
      const response = await api.patch(`${API_PREFIX}/users/me/password`, {
        data: {
          currentPassword: user.password,
          newPassword: 'password',
        },
      });
      await expectStatus(response, 400);
    } finally {
      await api.dispose();
    }
  });

  test('GET /users/:id allows admin to read another user', async ({ app, adminApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-admin-read-target');
    await api.dispose();

    const response = await adminApi.get(`${API_PREFIX}/users/${created.id}`);
    await expectStatus(response, 200);
    const body = await response.json();
    expect(body).toMatchObject({ id: created.id });
    expectNoPassword(body);
  });

  test('GET /users/:id prevents ordinary user from reading another user', async ({ app, primaryUserApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-user-read-target');
    await api.dispose();

    const response = await primaryUserApi.get(`${API_PREFIX}/users/${created.id}`);
    await expectStatus(response, 403);
  });

  test('PATCH /users/:id allows admin to update another user', async ({ app, adminApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-admin-update-target');
    await api.dispose();

    const username = `${app.runId}-admin-updated`;
    const response = await adminApi.patch(`${API_PREFIX}/users/${created.id}`, { data: { username } });
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: created.id, username });
  });

  test('PATCH /users/:id prevents ordinary user from updating another user', async ({ app, primaryUserApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-user-update-target');
    await api.dispose();

    const response = await primaryUserApi.patch(`${API_PREFIX}/users/${created.id}`, { data: { username: 'blocked' } });
    await expectStatus(response, 403);
  });

  test('PATCH /users/:id/password allows admin to change another user password', async () => {
    test.fixme(true, 'BUG: users service forbids admin from changing another user password');
  });

  test('PATCH /users/:id/password prevents ordinary user from changing another user password', async ({ app, primaryUserApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-password-target');
    await api.dispose();

    const response = await primaryUserApi.patch(`${API_PREFIX}/users/${created.id}/password`, {
      data: {
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      },
    });
    await expectStatus(response, 403);
  });

  test('DELETE /users/:id allows admin to delete a user and deleted user cannot sign in', async ({ app, adminApi }) => {
    const { api, user, created } = await createSignedInUser(app.runId, 'users-admin-delete-target');
    await api.dispose();

    await expectStatus(await adminApi.delete(`${API_PREFIX}/users/${created.id}`), 204);

    const guestApi = await newApiContext();
    try {
      await expectStatus(await guestApi.post(`${API_PREFIX}/auth/signin`, { data: { email: user.email, password: user.password } }), 401);
    } finally {
      await guestApi.dispose();
    }
  });

  test('DELETE /users/:id prevents non-admin deletion', async ({ app, primaryUserApi }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-delete-target');
    await api.dispose();

    const response = await primaryUserApi.delete(`${API_PREFIX}/users/${created.id}`);
    await expectStatus(response, 403);
  });

  test('invalid UUID path params return 400', async ({ adminApi }) => {
    await expectStatus(await adminApi.get(`${API_PREFIX}/users/not-a-uuid`), 400);
    await expectStatus(await adminApi.patch(`${API_PREFIX}/users/not-a-uuid`, { data: { username: 'bad' } }), 400);
    await expectStatus(await adminApi.delete(`${API_PREFIX}/users/not-a-uuid`), 400);
  });

  test('non-admin cannot change role through PATCH /users/me', async ({ app }) => {
    const { api, created } = await createSignedInUser(app.runId, 'users-role-self');

    try {
      updateUserRole(created.email, 'User');
      const response = await api.patch(`${API_PREFIX}/users/me`, { data: { role: 'Admin' } });
      await expectStatus(response, 403);
    } finally {
      await api.dispose();
    }
  });
});
