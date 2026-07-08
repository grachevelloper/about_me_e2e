import { test } from '../../fixtures/test';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { createTodo } from '../../helpers/api/entities/todos-api';
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
});
