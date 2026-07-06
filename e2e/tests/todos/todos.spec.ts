import { test, expect } from '../../fixtures/test';
import { createTodo, listTodos } from '../../helpers/api/entities/todos-api';

test.describe('todos', () => {
  test('authenticated user creates todo and anonymous user can read it', async ({ todoDetailsPage, app }) => {
    test.fixme(true, 'BUG: todos created by regular users are not exposed through public todo list/details');

    const todo = await createTodo(app, 'userA', {
      title: `${app.runId} readable todo`,
      content: `${app.runId} readable todo content`,
    });

    const todos = await listTodos();
    expect(todos.items.map((item) => item.id)).toContain(todo.id);

    await todoDetailsPage.open(todo.id);
    await todoDetailsPage.expectTitleVisible(todo.title);
  });
});
