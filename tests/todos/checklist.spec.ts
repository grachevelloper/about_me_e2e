import { test } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser-context';
import { createTodo } from '../../helpers/todos-api';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

test.describe('checklist', () => {
  test('owner can open todo checklist area', async ({ browser, app }) => {
    const todo = await createTodo(app, 'userA', {
      title: `${app.runId} checklist todo`,
      content: `${app.runId} checklist todo content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'userA', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.expectTitleVisible(todo.title);
    await session.todoDetailsPage.expectChecklistAreaVisible();

    await session.close();
  });
});
