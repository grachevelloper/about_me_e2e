import { test } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { DraftsPage } from '../../pages/articles/DraftsPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';

test.describe('navigation', () => {
  test('public routes render for anonymous users', async ({ appShell }) => {
    for (const route of ['/', '/resume', '/articles']) {
      await appShell.open(route);
      await appShell.expectPublicPageVisible();
    }
  });

  test('unknown route shows not-found page', async ({ errorPage }) => {
    await errorPage.open('/definitely-not-existing-route');

    await errorPage.expectNotFound();
  });

  test('writer can open drafts page with authenticated storage state', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'writerA', (page) => ({
      draftsPage: new DraftsPage(page),
    }));

    await session.draftsPage.open();
    await session.draftsPage.expectOpened();

    await session.close();
  });

  test('admin can open create todo page with authenticated storage state', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
    }));

    await session.newTodoPage.open();
    await session.newTodoPage.expectOpened();

    await session.close();
  });
});
