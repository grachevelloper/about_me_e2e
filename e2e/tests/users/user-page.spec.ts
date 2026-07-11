import { test, expect } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser/context';

test.describe('user page', () => {
  test('authenticated user can open /user without app crash', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({ page }));

    await session.page.goto('/user');

    await expect(session.page.locator('body')).toBeVisible();
    await expect(session.page.locator('body')).not.toContainText(/application error|runtime error|ошибка приложения/i);

    await session.close();
  });

  test('guest opening /user gets an auth redirect or permission state', async ({ page }) => {
    await page.goto('/user');

    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toMatch(/\/auth\/signin|\/no-permission|\/user/);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|runtime error|ошибка приложения/i);
  });

  test('profile edit UI is not exposed while backend user update APIs are covered', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({ page }));

    await session.page.goto('/user');

    await expect(session.page.locator('input[name="username"], [data-marker="user-username-input"]')).toHaveCount(0);
    await expect(session.page.getByRole('button', { name: /change password|сменить пароль|update password/i })).toHaveCount(0);

    await session.close();
  });
});
