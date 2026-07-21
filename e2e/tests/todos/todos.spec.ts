import { test, expect } from '../../fixtures/test';
import { todoPriorities, type TodoState } from '../../data/todos';
import { createTodo, listTodos } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { moveTodoToPublicOwner } from '../../helpers/db';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';
import { NewTodoPage } from '../../pages/todos/NewTodoPage';

test.describe('todos', () => {
  test('authenticated user creates todo and anonymous user can read it', async ({ todoDetailsPage, app }) => {

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} readable todo`,
      content: `${app.runId} readable todo content`,
    });

    const todos = await listTodos();
    expect(todos.items.map((item) => item.id)).toContain(todo.id);

    await todoDetailsPage.open(todo.id);
    await todoDetailsPage.expectTitleVisible(todo.title);
  });

  test('main page renders about/current sections and opens a public todo row', async ({ page, todoDetailsPage, app }) => {

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} public row todo`,
      content: `${app.runId} public row content`,
    });
    moveTodoToPublicOwner(todo.id);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /today|задачи/i })).toBeVisible();
    await expect(page.locator('body')).toContainText(/currently|сегодня|read|читаю|watch|смотрю/i);

    await page.locator('[data-marker="todo-card"]').filter({ hasText: todo.title }).click();
    await expect(page).toHaveURL(new RegExp(`/todos/${todo.id}$`));
    await todoDetailsPage.expectTitleVisible(todo.title);
  });

  test('guest can open public todo details with title and content', async ({ todoDetailsPage, app }) => {

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} guest readable todo`,
      content: `${app.runId} guest readable content`,
    });
    moveTodoToPublicOwner(todo.id);

    await todoDetailsPage.open(todo.id);

    await todoDetailsPage.expectTitleVisible(todo.title);
    await todoDetailsPage.expectContentVisible(todo.content);
  });

  test('authenticated owner can like and unlike todo and count survives reload', async ({ browser, app }) => {
    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} like todo`,
      content: `${app.runId} like content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.like();
    await session.todoDetailsPage.expectLikeCount(1);

    await session.page.reload();
    await session.todoDetailsPage.expectLikeCount(1);

    await session.todoDetailsPage.like();
    await session.todoDetailsPage.expectLikeCount(0);

    await session.close();
  });

  test('owner can edit todo title and content and changes persist after reload', async ({ browser, app }) => {

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} editable todo`,
      content: `${app.runId} editable content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));
    const nextTitle = `${app.runId} updated todo title`;
    const nextContent = `${app.runId} updated todo content`;

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.editTitle(nextTitle);
    await session.todoDetailsPage.editContent(nextContent);

    await session.page.reload();
    await session.todoDetailsPage.expectTitleVisible(nextTitle);
    await session.todoDetailsPage.expectContentVisible(nextContent);

    await session.close();
  });

  test('owner can change each todo priority and persist it after reload', async ({ browser, app }) => {

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} priority todo`,
      content: `${app.runId} priority content`,
      priority: 'Medium',
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.expectPriority('Medium');

    for (const priority of todoPriorities.filter((priority) => priority !== 'Medium')) {
      await session.todoDetailsPage.selectPriority(priority);
      await session.page.reload();
      await session.todoDetailsPage.expectPriority(priority);
    }

    await session.todoDetailsPage.selectPriority('Medium');
    await session.page.reload();
    await session.todoDetailsPage.expectPriority('Medium');

    await session.close();
  });

  test('owner can change todo state through allowed transitions and persist it after reload', async ({ browser, app }) => {
    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} state todo`,
      content: `${app.runId} state content`,
      state: 'Planning',
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));
    const transitions: TodoState[] = ['In_work', 'Finished', 'In_work', 'Canceled', 'Planning'];

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.expectState('Planning');

    for (const state of transitions) {
      await session.todoDetailsPage.selectState(state);
      await session.page.reload();
      await session.todoDetailsPage.expectState(state);
    }

    await session.close();
  });

  test('@critical admin can create todo from /todos/new with selected priority and state', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
      todoDetailsPage: new TodoDetailsPage(page),
    }));
    const title = `${app.runId} ui created todo`;
    const content = `${app.runId} ui created content`;

    await session.newTodoPage.open();
    await session.newTodoPage.expectOpened();
    await session.newTodoPage.fillTitle(title);
    await session.newTodoPage.fillContent(content);
    await session.newTodoPage.selectPriority('Low|Низкий');
    await session.newTodoPage.selectState('In work|В работе');
    await session.newTodoPage.create();

    await expect(session.page).toHaveURL(/\/todos\/[0-9a-f-]+$/);
    await session.todoDetailsPage.expectTitleVisible(title);
    await session.todoDetailsPage.expectContentVisible(content);

    await session.close();
  });

  test('new todo back and cancel buttons navigate to the previous page', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
    }));

    await session.page.goto('/resume');
    await session.newTodoPage.open();
    await session.newTodoPage.back();
    await expect(session.page).toHaveURL(/\/resume$/);

    await session.newTodoPage.open();
    await session.newTodoPage.cancel();
    await expect(session.page).toHaveURL(/\/resume$/);

    await session.close();
  });

  test('new todo form validates required fields and persists draft after reload', async ({ browser, app }) => {
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      newTodoPage: new NewTodoPage(page),
    }));
    const title = `${app.runId} draft title`;
    const content = `${app.runId} draft content`;

    await session.newTodoPage.open();
    await session.newTodoPage.create();
    await session.newTodoPage.expectRequiredValidation();

    await session.newTodoPage.fillTitle(title);
    await session.newTodoPage.fillContent(content);
    await session.page.reload();

    await session.newTodoPage.expectTitleValue(title);
    await session.newTodoPage.expectContentValue(content);

    await session.close();
  });

  test('guest cannot access protected todo creation UI', async ({ page }) => {

    await page.goto('/todos/new');

    await expect(page).not.toHaveURL(/\/todos\/new$/);
    await expect(page.locator('[data-marker="todo-title-input"]')).toHaveCount(0);
  });

  test('user and writer cannot access admin-only todo creation UI', async ({ browser, app }) => {

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
});
