import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { AppShell } from '../../pages/navigation/AppShell';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';
import { API_PREFIX } from '../../helpers/api/client';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth <= root.clientWidth + 1;
      }),
    )
    .toBe(true);
}

test.describe('responsive smoke', () => {
  test('desktop navigation is visible and clickable', async ({ appShell }) => {
    await appShell.open('/');
    await appShell.expectNavigationVisible();

    await appShell.openResumeViaNav();
    await appShell.expectRoute(/\/resume$/);

    await appShell.openArticlesViaNav();
    await appShell.expectRoute(/\/articles$/);
  });

  test('mobile navigation is visible, clickable, and does not permanently cover content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const appShell = new AppShell(page);

    await appShell.open('/');
    await appShell.toggleSidebar();
    await appShell.expectNavigationVisible();
    await appShell.openArticlesViaNav();

    await appShell.expectRoute(/\/articles$/);
    await expect(page.getByRole('heading', { name: /^(articles|статьи)$/i })).toBeVisible();
    await expect(page.locator('main').first()).toBeInViewport();
  });

  test('auth forms fit mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const loginPage = new LoginPage(page);

    await loginPage.open();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });

  test('todo details content, checklist, and comments do not overlap on mobile', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-mobile-todo`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} title`,
      content: `${label} content`,
    });
    await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`);
    await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: `${label} checklist item` } });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));
    await session.page.setViewportSize({ width: 390, height: 844 });

    await session.todoDetailsPage.open(todo.id);

    await session.todoDetailsPage.expectTitleVisible(todo.title);
    await session.todoDetailsPage.checklist.expectVisible();
    await expect(session.page.locator('[data-marker="comment-input"]').first()).toBeVisible();
    await expectNoHorizontalOverflow(session.page);

    await session.close();
  });

  test('article page content does not overlap on mobile', async ({ page, app }, testInfo) => {

    const label = `Mobile article ${Date.now()}`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} title`,
      content: `${label} content with readable mobile wrapping`,
      readTime: 4,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const articlePage = new ArticlePage(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await articlePage.open(article.id);

    await articlePage.expectArticleVisible(article);
    await expectNoHorizontalOverflow(page);
  });

  test('article editor controls remain reachable on mobile', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-mobile-editor`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} title`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));
    await session.page.setViewportSize({ width: 390, height: 844 });

    await session.draftEditorPage.open(draft.id);

    await expect(session.draftEditorPage.titleInput).toBeVisible();
    await expect(session.draftEditorPage.contentEditor).toBeVisible();
    await expect(session.draftEditorPage.publishButton.first()).toBeInViewport();
    await expectNoHorizontalOverflow(session.page);

    await session.close();
  });
});
