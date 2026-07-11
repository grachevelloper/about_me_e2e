import { test, expect } from '../../fixtures/test';
import { API_PREFIX, newApiContext } from '../../helpers/api/client';
import { expectAuthCookies, expectClearedAuthCookies, expectNoPassword, expectStatus } from '../../helpers/assertions/status';
import { invalidSignupUsers, uniqueUser } from '../../data/users';

test.describe('auth api', () => {
  test('POST /auth/signup creates a user without password and sets auth cookies', async ({ app }) => {
    const user = uniqueUser(app.runId, 'auth-signup');
    const api = await newApiContext();

    try {
      const response = await api.post(`${API_PREFIX}/auth/signup`, { data: user });
      await expectStatus(response, 201);
      expectAuthCookies(response);

      const body = await response.json();
      expect(body).toMatchObject({
        username: user.username,
        email: user.email,
        role: 'User',
      });
      expectNoPassword(body);
    } finally {
      await api.dispose();
    }
  });

  test('POST /auth/signup rejects invalid email', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signup`, { data: invalidSignupUsers.malformedEmail });
    await expectStatus(response, 400);
  });

  test('POST /auth/signup rejects empty username', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signup`, { data: invalidSignupUsers.emptyUsername });
    await expectStatus(response, 400);
  });

  test('POST /auth/signup rejects password shorter than 8 chars', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signup`, { data: invalidSignupUsers.shortPassword });
    await expectStatus(response, 400);
  });

  test('POST /auth/signup rejects password without uppercase, lowercase, or digit', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signup`, { data: invalidSignupUsers.weakPassword });
    await expectStatus(response, 400);
  });

  test('POST /auth/signup rejects duplicate email', async ({ app, guestApi }) => {
    const user = uniqueUser(app.runId, 'auth-duplicate');

    await expectStatus(await guestApi.post(`${API_PREFIX}/auth/signup`, { data: user }), 201);
    await expectStatus(await guestApi.post(`${API_PREFIX}/auth/signup`, { data: user }), 409);
  });

  test('POST /auth/signin authenticates valid credentials and sets cookies', async ({ app, guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signin`, {
      data: {
        email: app.users.primaryUser.email,
        password: app.users.primaryUser.password,
      },
    });

    await expectStatus(response, 200);
    expectAuthCookies(response);
    expectNoPassword(await response.json());
  });

  test('POST /auth/signin rejects wrong password', async ({ app, guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signin`, {
      data: {
        email: app.users.primaryUser.email,
        password: 'WrongPassword123',
      },
    });

    await expectStatus(response, 401);
  });

  test('POST /auth/signin rejects unknown email', async ({ app, guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signin`, {
      data: {
        email: `${app.runId}-unknown@e2e.local`,
        password: 'Password123',
      },
    });

    await expectStatus(response, 401);
  });

  test('POST /auth/signin rejects malformed email', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/signin`, {
      data: {
        email: 'not-an-email',
        password: 'Password123',
      },
    });

    await expectStatus(response, 400);
  });

  test('POST /auth/refresh refreshes tokens with a valid refresh cookie', async ({ app }) => {
    const api = await newApiContext();

    try {
      await expectStatus(
        await api.post(`${API_PREFIX}/auth/signin`, {
          data: {
            email: app.users.primaryUser.email,
            password: app.users.primaryUser.password,
          },
        }),
        200,
      );

      const response = await api.post(`${API_PREFIX}/auth/refresh`);
      await expectStatus(response, 200);
      expectAuthCookies(response);
    } finally {
      await api.dispose();
    }
  });

  test('POST /auth/refresh returns 401 without refresh cookie', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/refresh`);
    await expectStatus(response, 401);
  });

  test('POST /auth/refresh returns 401 with invalid refresh cookie', async () => {
    const api = await newApiContext();

    try {
      const response = await api.post(`${API_PREFIX}/auth/refresh`, {
        headers: {
          cookie: 'refreshToken=invalid-refresh-token',
        },
      });
      await expectStatus(response, 401);
    } finally {
      await api.dispose();
    }
  });

  test('POST /auth/logout clears cookies and invalidates refresh token', async ({ app }) => {
    const api = await newApiContext();

    try {
      await expectStatus(
        await api.post(`${API_PREFIX}/auth/signin`, {
          data: {
            email: app.users.primaryUser.email,
            password: app.users.primaryUser.password,
          },
        }),
        200,
      );

      const logout = await api.post(`${API_PREFIX}/auth/logout`);
      await expectStatus(logout, 200);
      expectClearedAuthCookies(logout);

      await expectStatus(await api.post(`${API_PREFIX}/auth/refresh`), 401);
    } finally {
      await api.dispose();
    }
  });

  test('POST /auth/logout returns 401 for guest', async ({ guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/auth/logout`);
    await expectStatus(response, 401);
  });

  test('GET /auth/check returns true for authenticated user', async ({ primaryUserApi }) => {
    const response = await primaryUserApi.get(`${API_PREFIX}/auth/check`);
    await expectStatus(response, 200);
    expect(await response.json()).toBe(true);
  });

  test('GET /auth/check returns 401 for guest', async ({ guestApi }) => {
    const response = await guestApi.get(`${API_PREFIX}/auth/check`);
    await expectStatus(response, 401);
  });

  test('GET /auth/me returns the current user', async ({ app, primaryUserApi }) => {
    const response = await primaryUserApi.get(`${API_PREFIX}/auth/me`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({
      id: app.users.primaryUser.id,
      email: app.users.primaryUser.email,
    });
  });

  test('GET /auth/me returns 401 for guest', async ({ guestApi }) => {
    const response = await guestApi.get(`${API_PREFIX}/auth/me`);
    await expectStatus(response, 401);
  });
});
