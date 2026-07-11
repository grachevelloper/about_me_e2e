import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { moveTodoToPublicOwner } from '../../helpers/db';
import { AppShell } from '../../pages/navigation/AppShell';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

test.describe('permissions matrix', () => {
  test('@critical guest can open public routes and published article', async ({ page, app }, testInfo) => {
    const appShell = new AppShell(page);
    const articlePage = new ArticlePage(page);
    const label = `${app.runId}-${testInfo.project.name}-guest-public`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');

    for (const route of ['/', '/resume', '/articles']) {
      await appShell.open(route);
      await appShell.expectPublicPageVisible();
    }

    await articlePage.open(article.id);
    await articlePage.expectArticleVisible(article);
  });

  test('guest can open public todo details', async ({ todoDetailsPage, app }, testInfo) => {
    test.fixme(true, 'BUG: frontend redirects or renders pending/error state for public todo details while API allows public read');

    const label = `${app.runId}-${testInfo.project.name}-guest-todo`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} todo content`,
    });
    moveTodoToPublicOwner(todo.id);

    await todoDetailsPage.open(todo.id);
    await todoDetailsPage.expectTitleVisible(todo.title);
  });

  test('user can suggest todo and like article', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-user-actions`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      appShell: new AppShell(page),
      articlePage: new ArticlePage(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openSuggestTodoAction();
    await session.appShell.expectSuggestModalVisible();

    await session.articlePage.open(article.id);
    await session.articlePage.like();
    await session.articlePage.expectLikeState(1, true);

    await session.close();
  });

  test('user can comment on article', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-user-comment`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = `${label} comment`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.create(comment);
    await session.articlePage.comments.expectCommentVisible(comment);

    await session.close();
  });

  test('user and writer cannot open admin-only todo creation route', async ({ browser, app }) => {
    test.fixme(true, 'BUG: /todos/new is directly accessible to non-admin authenticated users');

    for (const role of ['primaryUser', 'writer'] as const) {
      const session = await createAuthenticatedPage(browser, app, role, (page) => ({
        newTodoPage: new NewTodoPage(page),
      }));

      await session.newTodoPage.open();
      await expect(session.page).not.toHaveURL(/\/todos\/new$/);
      await expect(session.page.locator('[data-marker="todo-title-input"]')).toHaveCount(0);

      await session.close();
    }
  });

  test('writer cannot access admin-only user operations through API-backed UI route', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({ page }));

    await session.page.goto(`/user/${app.users.primaryUser.id}`);

    await expect(session.page.locator('body')).toBeVisible();
    await expect(session.page.locator('body')).not.toContainText(/application error|runtime error|ошибка приложения/i);
    await expect(session.page.getByRole('button', { name: /delete user|удалить пользователя|change role/i })).toHaveCount(0);

    await session.close();
  });

  test('writer can create, edit, and publish own draft but cannot edit another writer draft', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-writer`;
    const ownDraft = await createDraftArticle(app, 'writer', {
      title: `${label} own draft`,
      content: `${label} own content`,
    });
    const otherDraft = await createDraftArticle(app, 'secondaryWriter', {
      title: `${label} other draft`,
      content: `${label} other content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));
    const nextTitle = `${label} updated title`;

    await session.draftEditorPage.open(ownDraft.id);
    await session.draftEditorPage.updateTitle(nextTitle);
    await expect(session.draftEditorPage.titleInput).toHaveValue(nextTitle);
    await session.draftEditorPage.publish();
    await session.draftEditorPage.expectPublished(ownDraft.id);

    await session.draftEditorPage.open(otherDraft.id);
    await expect(session.page).toHaveURL(/\/no-permission$/);

    await session.close();
  });

  test('admin can create todo', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      appShell: new AppShell(page),
      newTodoPage: new NewTodoPage(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openCreateTodoAction();
    await session.newTodoPage.expectOpened();

    await session.close();
  });

  test('admin can create article', async ({ browser, app }) => {
    test.fixme(true, 'BUG: create article action submits an empty draft content and does not open editor');

    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      appShell: new AppShell(page),
    }));

    await session.appShell.open('/');
    await session.appShell.openCreateArticleAction();
    await expect(session.page).toHaveURL(/\/articles\/draft\/[0-9a-f-]+/i);

    await session.close();
  });

  test('admin moderation is covered by API suites while unsupported moderation UI is not exposed', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({ page }));

    await session.page.goto('/articles');

    await expect(session.page.getByRole('button', { name: /moderate|ban|delete user|модер|заблок/i })).toHaveCount(0);

    await session.close();
  });

  test('401 behavior does not leave UI in a broken state', async ({ page }) => {
    await page.goto('/articles/drafts');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|runtime error|ошибка приложения/i);
  });
});
