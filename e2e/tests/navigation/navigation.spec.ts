import { test, expect } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { AppShell } from '../../pages/navigation/AppShell';
import { DraftsPage } from '../../pages/articles/DraftsPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';

test.describe('navigation', () => {
  test('guest can open public routes', async ({ appShell }) => {
    for (const route of ['/', '/resume', '/articles']) {
      await appShell.open(route);
      await appShell.expectPublicPageVisible();
    }
  });

  test('main nav Home opens /', async ({ appShell }) => {
    await appShell.open('/resume');

    await appShell.openHomeViaNav();

    await appShell.expectRoute(/\/$/);
  });

  test('main nav Resume opens /resume', async ({ appShell }) => {
    await appShell.open('/');

    await appShell.openResumeViaNav();

    await appShell.expectRoute(/\/resume/);
  });

  test('main nav Articles opens /articles', async ({ appShell }) => {
    await appShell.open('/');

    await appShell.openArticlesViaNav();

    await appShell.expectRoute(/\/articles/);
  });

  test('guest Sign in action opens /auth/signin', async ({ appShell, loginPage }) => {
    await appShell.open('/');

    await appShell.openSignInAction();

    await loginPage.expectOpened();
  });

  test('guest Sign up action opens /auth/signup', async ({ appShell, registrationPage }) => {
    await appShell.open('/');

    await appShell.openSignUpAction();

    await registrationPage.expectIntroStep();
    await appShell.expectRoute(/\/auth\/signup/);
  });

  test('user Suggest action opens todo suggestion modal', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openSuggestTodoAction();
    await session.appShell.expectSuggestModalVisible();

    await session.close();
  });

  test('user logout action opens logout dialog', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openLogoutDialog();
    await session.appShell.expectLogoutDialogVisible();

    await session.close();
  });

  test('logout cancel keeps user authenticated', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openLogoutDialog();
    await session.appShell.cancelLogout();
    await session.appShell.expectUserVisible(app.users.primaryUser.username);

    await session.close();
  });

  test('logout confirm clears session and guest actions return', async ({ browser, app }) => {
    test.fixme(true, 'BUG: logout success does not clear AuthContext or rerender guest actions');

    const session = await createAuthenticatedPage(browser, app, 'secondaryUser', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openLogoutDialog();
    await session.appShell.confirmLogout();
    await session.appShell.expectGuestActionsVisible();

    await session.close();
  });

  test('writer Drafts nav opens /articles/drafts', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      appShell: new AppShell(page),
      draftsPage: new DraftsPage(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openDraftsViaNav();
    await session.draftsPage.expectOpened();

    await session.close();
  });

  test('writer Create article action creates draft and opens editor', async ({ browser, app }) => {
    test.fixme(true, 'BUG: create article action submits an empty draft content and does not open editor');

    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openCreateArticleAction();
    await expect(session.page).toHaveURL(/\/articles\/draft\/[0-9a-f-]+/i);

    await session.close();
  });

  test('admin Create todo action opens /todos/new', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      appShell: new AppShell(page),
      newTodoPage: new NewTodoPage(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openCreateTodoAction();
    await session.newTodoPage.expectOpened();

    await session.close();
  });

  test('admin Create article action creates draft and opens editor', async ({ browser, app }) => {
    test.fixme(true, 'BUG: create article action submits an empty draft content and does not open editor');

    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openCreateArticleAction();
    await expect(session.page).toHaveURL(/\/articles\/draft\/[0-9a-f-]+/i);

    await session.close();
  });

  test('sidebar collapse and expand buttons work on desktop', async ({ appShell }) => {
    test.fixme(true, 'BUG: desktop layout does not expose a general sidebar collapse control');

    await appShell.open('/');
    await appShell.toggleSidebar();
    await appShell.expectNavigationVisible();
  });

  test('mobile navigation remains clickable and does not cover page content', async ({ page }) => {
    const appShell = new AppShell(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await appShell.open('/');
    await appShell.toggleSidebar();
    await appShell.openArticlesViaNav();

    await appShell.expectRoute(/\/articles/);
    await expect(page.getByRole('heading', { name: /^(articles|статьи)$/i })).toBeVisible();
  });

  test('cookie notification Accept hides notification and persists acceptance', async ({ page }) => {
    test.slow();
    const appShell = new AppShell(page);
    await page.context().clearCookies();

    await appShell.open('/');
    await appShell.expectCookieNotificationVisible();
    await appShell.acceptCookies();
    await appShell.expectCookieNotificationHidden();
    await appShell.reload();
    await appShell.expectCookieNotificationHidden();
  });

  test('footer Telegram button opens external Telegram URL', async ({ page }) => {
    const appShell = new AppShell(page);
    await appShell.open('/');

    await expect(page.getByRole('link', { name: /@gracheveloper/i })).toHaveAttribute('href', /https:\/\/t\.me\/gracheveloper/);
  });

  test('footer email button has mailto href', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /gracheveloper@gmail\.com/i })).toHaveAttribute(
      'href',
      'mailto:gracheveloper@gmail.com',
    );
  });

  test('unknown route renders not-found page', async ({ errorPage }) => {
    await errorPage.open('/definitely-not-existing-route');

    await errorPage.expectNotFound();
  });

  test('/no-permission renders permission page', async ({ errorPage }) => {
    await errorPage.open('/no-permission');

    await errorPage.expectNoPermission();
  });

  test('status page back button navigates back', async ({ errorPage, appShell }) => {
    await appShell.open('/resume');
    await errorPage.open('/definitely-not-existing-route');

    await errorPage.goBack();

    await appShell.expectRoute(/\/resume/);
  });

  test('direct reload works on all public routes', async ({ appShell }) => {
    for (const route of ['/', '/resume', '/articles']) {
      await appShell.open(route);
      await appShell.reload();

      await appShell.expectPublicPageVisible();
    }
  });
});
