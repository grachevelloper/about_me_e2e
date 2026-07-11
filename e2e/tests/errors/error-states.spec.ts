import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';
import { DraftsPage } from '../../pages/articles/DraftsPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

test.describe('error states', () => {
  test('missing article shows not-found state or redirects to not-found route', async ({ errorPage }) => {
    test.fixme(true, 'BUG: missing article renders a blank article page instead of a not-found state');

    await errorPage.open('/articles/00000000-0000-4000-8000-000000000000');

    await errorPage.expectNotFound();
  });

  test('no-permission route renders permission error', async ({ errorPage }) => {
    await errorPage.open('/no-permission');

    await errorPage.expectNoPermission();
  });

  test('articles list handles API 500 without infinite skeleton', async ({ page }) => {
    test.fixme(true, 'BUG: articles list hides API 500 behind empty content instead of a visible error state');

    await page.route('**/api/articles**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'E2E forced failure' }) });
      }

      return route.continue();
    });

    await page.goto('/articles');

    await expect(page.locator('.ant-skeleton, [aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/error|failed|ошиб|не удалось/i);
  });

  test('todo details handles API 500 with visible error state', async ({ page, app }, testInfo) => {
    test.fixme(true, 'BUG: todo details renders "Is Pending occurred" for API 500 instead of a user-visible error state');

    const label = `${app.runId}-${testInfo.project.name}-todo-error`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} todo content`,
    });

    await page.route(`**/api/todos/${todo.id}`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'E2E forced failure' }) });
      }

      return route.continue();
    });

    await page.goto(`/todos/${todo.id}`);

    await expect(page.locator('body')).toContainText(/error|failed|ошиб|не удалось/i);
  });

  test('comments list handles API 500 with visible error text', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-comments-error`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.page.route(`**/api/comments/article/${article.id}**`, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'E2E forced failure' }) }),
    );

    await session.articlePage.open(article.id);

    await expect(session.page.locator('body')).toContainText(/error|failed|ошиб|не удалось/i);

    await session.close();
  });

  test('browser offline state shows offline overlay and returning online restores usability', async ({ page }) => {
    test.fixme(true, 'BUG: app has no offline overlay and reload fails with browser network error while offline');

    await page.goto('/');

    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator('body')).toContainText(/offline|нет сети|connection|соедин/i);

    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|runtime error|ошибка приложения/i);
  });

  test('direct reload works on article detail route', async ({ page, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-reload-details`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');

    await page.goto(`/articles/${article.id}`);
    await page.reload();
    await expect(page.locator('body')).toContainText(article.title);
  });

  test('direct reload works on public todo detail route', async ({ page, app }, testInfo) => {
    test.fixme(true, 'BUG: public todo detail reload renders not-found while API allows public read for exposed todos');

    const label = `${app.runId}-${testInfo.project.name}-reload-todo`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} todo content`,
    });

    await page.goto(`/todos/${todo.id}`);
    await page.reload();
    await expect(page.locator('body')).toContainText(todo.title);
  });

  test('direct reload works on protected article and todo routes with sessions', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-reload-protected`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} draft content`,
    });

    const writer = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftsPage: new DraftsPage(page),
      draftEditorPage: new DraftEditorPage(page),
    }));

    await writer.draftsPage.open();
    await writer.page.reload();
    await writer.draftsPage.expectOpened();

    await writer.draftEditorPage.open(draft.id);
    await writer.page.reload();
    await writer.draftEditorPage.expectOpened(draft.id);

    await writer.close();

    const admin = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
    }));

    await admin.newTodoPage.open();
    await admin.page.reload();
    await admin.newTodoPage.expectOpened();

    await admin.close();
  });

  test('direct reload works on auth routes', async ({ page }) => {
    for (const route of ['/auth/signin', '/auth/signup']) {
      await page.goto(route);
      await page.reload();
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
