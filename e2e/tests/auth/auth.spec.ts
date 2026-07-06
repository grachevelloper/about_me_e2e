import { test, expect } from '../../fixtures/test';
import { API_PREFIX, newApiContext } from '../../helpers/api/client';

test.describe('auth', () => {
  test('signup authenticates a new user', async ({ registrationPage, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-signup-${Date.now()}`;
    const email = `${label}@e2e.local`;

    await registrationPage.open();
    await registrationPage.register({
      username: label,
      email,
      password: 'Password123',
    });

    await registrationPage.expectRegistrationFinished();
  });

  test('signin with wrong password shows a user-visible error', async ({ loginPage, app }) => {
    await loginPage.open();
    await loginPage.login(app.users.userA.email, 'WrongPassword123');

    await loginPage.expectLoginError();
  });

  test('signin authenticates user session', async ({ loginPage, appShell, app }) => {
    await loginPage.open();
    await loginPage.login(app.users.userA.email, app.users.userA.password);

    await appShell.expectUserVisible(app.users.userA.username);
  });

  test('anonymous user cannot perform protected mutations', async () => {
    const api = await newApiContext();

    try {
      const response = await api.post(`${API_PREFIX}/todos`, {
        data: {
          title: 'anonymous forbidden todo',
          content: 'anonymous forbidden todo content',
        },
      });

      expect(response.status()).toBe(401);
    } finally {
      await api.dispose();
    }
  });
});
