import { test, expect } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

test.describe('checklist', () => {
  test('owner can open todo checklist area', async ({ browser, app }, testInfo) => {
    test.slow();

    const label = `${app.runId}-${testInfo.project.name}`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist todo content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.expectTitleVisible(todo.title);
    await session.todoDetailsPage.expectChecklistAreaVisible();

    await session.close();
  });

  test('todo without checklist shows create actions and can create an empty checklist', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-empty`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.expectVisible();
    await session.todoDetailsPage.checklist.expectCreateChecklistActionVisible();

    await session.todoDetailsPage.checklist.create();
    await session.todoDetailsPage.checklist.expectEmptyChecklistVisible();

    await session.close();
  });

  test('owner can add first and subsequent checklist items', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-items`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));
    const first = `${label} first item`;
    const second = `${label} second item`;

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.create();
    await session.todoDetailsPage.checklist.openAddItem();
    await session.todoDetailsPage.checklist.expectAddButtonDisabled();
    await session.todoDetailsPage.checklist.addInput.fill(first);
    await session.todoDetailsPage.checklist.addButton.click();
    await session.todoDetailsPage.checklist.expectItemVisible(first);

    await session.todoDetailsPage.checklist.addItem(second);
    await session.todoDetailsPage.checklist.expectItemVisible(second);

    await session.page.reload();
    await session.todoDetailsPage.checklist.expectItemVisible(first);
    await session.todoDetailsPage.checklist.expectItemVisible(second);

    await session.close();
  });

  test('owner can edit checklist item and cancel an inline edit', async ({ browser, app, primaryUserApi }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-edit`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const original = `${label} original item`;
    const edited = `${label} edited item`;
    const canceled = `${label} canceled item`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: original } }), 201);

    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.editItem(original, edited);
    await session.todoDetailsPage.checklist.startEditItem(edited);
    await session.todoDetailsPage.checklist.cancelEditedItem(edited, canceled);

    await session.page.reload();
    await session.todoDetailsPage.checklist.expectItemVisible(edited);
    await expect(session.page.locator('[data-marker="checklist-item"]').filter({ hasText: canceled })).toHaveCount(0);

    await session.close();
  });

  test('owner can delete checklist item with confirmation and cancel preserves item', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-delete`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const preserved = `${label} preserved item`;
    const removed = `${label} removed item`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: preserved } }), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: removed } }), 201);

    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.deleteItem(preserved);
    await session.todoDetailsPage.checklist.cancelDelete();
    await session.todoDetailsPage.checklist.expectItemVisible(preserved);

    await session.todoDetailsPage.checklist.deleteItem(removed);
    await session.todoDetailsPage.checklist.confirmDelete();
    await expect(session.page.locator('[data-marker="checklist-item"]').filter({ hasText: removed })).toHaveCount(0);
    await session.todoDetailsPage.checklist.expectItemVisible(preserved);

    await session.close();
  });

  test('clicking a checklist step updates progress and persists after reload', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-progress`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const first = `${label} first step`;
    const second = `${label} second step`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: first } }), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: second } }), 201);

    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.setProgress(second);
    await session.todoDetailsPage.checklist.expectProgressText('Выполнено');

    await session.page.reload();
    await session.todoDetailsPage.checklist.expectProgressText('Выполнено');

    await session.close();
  });

  test('finish button exits checklist editing mode', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-finish`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const item = `${label} item`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: item } }), 201);

    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.enterEditMode();
    await session.todoDetailsPage.checklist.finishEditMode();
    await session.todoDetailsPage.checklist.expectEditModeFinished();

    await session.close();
  });

  test('deleting a completed item keeps progress valid', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-completed-delete`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const first = `${label} completed`;
    const second = `${label} remaining`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: first } }), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: second } }), 201);
    await expectStatus(await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: 1 } }), 200);

    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.checklist.deleteItem(first);
    await session.todoDetailsPage.checklist.confirmDelete();
    await session.todoDetailsPage.checklist.expectItemVisible(second);
    await session.todoDetailsPage.checklist.expectProgressText('Текущий шаг');

    await session.page.reload();
    await session.todoDetailsPage.checklist.expectItemVisible(second);
    await session.todoDetailsPage.checklist.expectProgressText('Текущий шаг');

    await session.close();
  });

  test('non-owner cannot mutate checklist', async ({ browser, app, primaryUserApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-non-owner`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} checklist todo`,
      content: `${label} checklist content`,
    });
    const item = `${label} item`;

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 201);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: item } }), 201);

    const session = await createAuthenticatedPage(browser, app, 'secondaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await expect(session.page).toHaveURL(/\/no-permission$/);

    await session.close();
  });
});
