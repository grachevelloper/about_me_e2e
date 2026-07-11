import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { API_PREFIX } from '../../helpers/api/client';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

async function expectLabelOrPlaceholder(locator: import('@playwright/test').Locator, pattern: RegExp): Promise<void> {
  const accessibleText = await locator.evaluate((element) => [element.getAttribute('aria-label'), element.getAttribute('placeholder')].join(' '));
  expect(accessibleText).toMatch(pattern);
}

test.describe('accessibility smoke', () => {
  test('primary buttons have accessible names', async ({ page }) => {
    await page.goto('/');

    for (const button of await page.getByRole('button').all()) {
      const name = await button.evaluate((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('title') || '');
      expect(name).not.toBe('');
    }
  });

  test('like buttons expose aria-label and aria-pressed', async ({ browser, app }, testInfo) => {
    test.fixme(true, 'BUG: like buttons expose pressed state but do not consistently expose an aria-label');

    const label = `${app.runId}-${testInfo.project.name}-likes-a11y`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} todo content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.articlePage.open(article.id);
    await expect(session.articlePage.likeButton).toHaveAttribute('aria-label', /like|unlike|нрав|лайк/i);
    await expect(session.articlePage.likeButton).toHaveAttribute('aria-pressed', /true|false/);

    await session.todoDetailsPage.open(todo.id);
    const todoLike = session.page.getByRole('button', { name: /like|unlike|нрав|лайк/i }).first();
    await expect(todoLike).toHaveAttribute('aria-label', /like|unlike|нрав|лайк/i);
    await expect(todoLike).toHaveAttribute('aria-pressed', /true|false/);

    await session.close();
  });

  test('forms are usable with labels or placeholders', async ({ loginPage, newTodoPage, browser, app }) => {
    await loginPage.open();

    await expect(loginPage.emailInput).toBeEditable();
    await expect(loginPage.passwordInput).toBeEditable();
    await expectLabelOrPlaceholder(loginPage.emailInput, /email|почт/i);
    await expectLabelOrPlaceholder(loginPage.passwordInput, /password|парол/i);

    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
    }));

    await session.newTodoPage.open();
    await expect(session.newTodoPage.titleInput).toBeEditable();
    await expect(session.newTodoPage.contentInput).toBeEditable();
    await expectLabelOrPlaceholder(session.newTodoPage.titleInput, /title|назв/i);
    await expectLabelOrPlaceholder(session.newTodoPage.contentInput, /content|опис/i);

    await session.close();
  });

  test('Enter key submits signin form', async ({ loginPage, appShell, app }) => {
    await loginPage.open();
    await loginPage.emailInput.fill(app.users.primaryUser.email);
    await loginPage.passwordInput.fill(app.users.primaryUser.password);
    await loginPage.passwordInput.press('Enter');

    await appShell.expectUserVisible(app.users.primaryUser.username);
  });

  test('Enter key works for checklist add item', async ({ browser, app, primaryUserApi }, testInfo) => {
    test.fixme(true, 'BUG: checklist add item UI does not render the created item even though checklist API supports item creation');

    const label = `${app.runId}-${testInfo.project.name}-checklist-enter`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} content`,
    });
    await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`);
    const itemText = `${label} item`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.openAddItem();
    await session.todoDetailsPage.checklist.addInput.fill(itemText);
    await session.todoDetailsPage.checklist.addInput.press('Enter');

    await session.todoDetailsPage.checklist.expectItemVisible(itemText);

    await session.close();
  });
});
