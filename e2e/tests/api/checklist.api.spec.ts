import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { validTodo } from '../../data/todos';

const missingUuid = '00000000-0000-4000-8000-000000000000';

async function createTodo(primaryUserApi: APIRequestContext, runId: string, label: string) {
  const response = await primaryUserApi.post(`${API_PREFIX}/todos`, { data: validTodo(runId, label) });
  await expectStatus(response, 201);
  return (await response.json()) as { id: string };
}

async function createChecklist(primaryUserApi: APIRequestContext, todoId: string) {
  const response = await primaryUserApi.post(`${API_PREFIX}/todos/${todoId}/checklist`);
  await expectStatus(response, 201);
  return response;
}

async function createChecklistWithItems(
  primaryUserApi: APIRequestContext,
  todoId: string,
  items: string[],
) {
  await createChecklist(primaryUserApi, todoId);

  for (const text of items) {
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todoId}/checklist/items`, { data: { text } }), 201);
  }
}

async function expectEmptyBody(response: { text: () => Promise<string> }) {
  expect(await response.text()).toBe('');
}

test.describe('checklist api', () => {
  test('POST /todos/:todoId/checklist creates an empty checklist', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-create');
    const response = await createChecklist(primaryUserApi, todo.id);

    expect(await response.json()).toMatchObject({
      todoId: todo.id,
      text: [],
      progress: 0,
    });
  });

  test('GET /todos/:todoId/checklist returns the created checklist', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-get');
    await createChecklist(primaryUserApi, todo.id);

    const response = await primaryUserApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({
      todoId: todo.id,
      text: [],
      progress: 0,
    });
  });

  test('GET /todos/:todoId/checklist returns empty 200 before checklist creation', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-null');

    const response = await primaryUserApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`);
    await expectStatus(response, 200);
    await expectEmptyBody(response);
  });

  test('POST /todos/:todoId/checklist rejects duplicate checklist', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-duplicate');
    await createChecklist(primaryUserApi, todo.id);

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 409);
  });

  test('POST /todos/:todoId/checklist/items adds an item', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-add-item');
    await createChecklist(primaryUserApi, todo.id);

    const response = await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, {
      data: { text: `${app.runId} first item` },
    });
    await expectStatus(response, 201);
    expect(await response.json()).toMatchObject({
      todoId: todo.id,
      text: [`${app.runId} first item`],
      progress: 0,
    });
  });

  test('POST /items rejects empty text', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-empty-item');
    await createChecklist(primaryUserApi, todo.id);

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: '' } }), 400);
  });

  test('PATCH /items/:index updates item text', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-update-item');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} old text`]);

    const response = await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/items/0`, {
      data: { text: `${app.runId} new text` },
    });
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ text: [`${app.runId} new text`] });
  });

  test('PATCH /items/:index rejects negative index', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-negative-index');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} item`]);

    await expectStatus(
      await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/items/-1`, { data: { text: 'blocked' } }),
      404,
    );
  });

  test('PATCH /items/:index rejects non-number index', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-nonnumeric-index');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} item`]);

    await expectStatus(
      await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/items/not-a-number`, { data: { text: 'blocked' } }),
      400,
    );
  });

  test('PATCH /items/:index rejects out-of-range index', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-out-of-range');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} item`]);

    await expectStatus(await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/items/1`, { data: { text: 'blocked' } }), 404);
  });

  test('PATCH /progress increments and decrements progress', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-progress');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} one`, `${app.runId} two`]);

    const increment = await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: 1 } });
    await expectStatus(increment, 200);
    expect(await increment.json()).toMatchObject({ progress: 1 });

    const decrement = await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: -1 } });
    await expectStatus(decrement, 200);
    expect(await decrement.json()).toMatchObject({ progress: 0 });
  });

  test('PATCH /progress clamps progress between zero and item count', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-progress-clamp');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} one`, `${app.runId} two`]);

    const above = await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: 10 } });
    await expectStatus(above, 200);
    expect(await above.json()).toMatchObject({ progress: 2 });

    const below = await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: -10 } });
    await expectStatus(below, 200);
    expect(await below.json()).toMatchObject({ progress: 0 });
  });

  test('DELETE /items/:index removes an item', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-remove-item');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} remove me`, `${app.runId} keep me`]);

    const response = await primaryUserApi.delete(`${API_PREFIX}/todos/${todo.id}/checklist/items/0`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ text: [`${app.runId} keep me`] });
  });

  test('removing a completed item keeps progress valid', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-remove-completed');
    await createChecklistWithItems(primaryUserApi, todo.id, [`${app.runId} done`, `${app.runId} todo`]);
    await expectStatus(await primaryUserApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: 2 } }), 200);

    const response = await primaryUserApi.delete(`${API_PREFIX}/todos/${todo.id}/checklist/items/0`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({
      text: [`${app.runId} todo`],
      progress: 1,
    });
  });

  test('DELETE /checklist deletes checklist and deleted checklist returns empty 200', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-delete');
    await createChecklist(primaryUserApi, todo.id);

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/todos/${todo.id}/checklist`), 204);

    const getDeleted = await primaryUserApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`);
    await expectStatus(getDeleted, 200);
    await expectEmptyBody(getDeleted);
  });

  test('guest requests return 401', async ({ app, primaryUserApi, guestApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-guest');
    await createChecklist(primaryUserApi, todo.id);

    await expectStatus(await guestApi.post(`${API_PREFIX}/todos/${todo.id}/checklist`), 401);
    await expectStatus(await guestApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`), 401);
    await expectStatus(await guestApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: 'blocked' } }), 401);
    await expectStatus(await guestApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/items/0`, { data: { text: 'blocked' } }), 401);
    await expectStatus(await guestApi.patch(`${API_PREFIX}/todos/${todo.id}/checklist/progress`, { data: { delta: 1 } }), 401);
    await expectStatus(await guestApi.delete(`${API_PREFIX}/todos/${todo.id}/checklist/items/0`), 401);
    await expectStatus(await guestApi.delete(`${API_PREFIX}/todos/${todo.id}/checklist`), 401);
  });

  test('non-owner requests return 403 and admin can read another user checklist', async ({ app, primaryUserApi, secondaryUserApi, adminApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'checklist-permissions');
    await createChecklist(primaryUserApi, todo.id);

    await expectStatus(await secondaryUserApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`), 403);
    await expectStatus(await secondaryUserApi.post(`${API_PREFIX}/todos/${todo.id}/checklist/items`, { data: { text: 'blocked' } }), 403);

    const adminRead = await adminApi.get(`${API_PREFIX}/todos/${todo.id}/checklist`);
    await expectStatus(adminRead, 200);
    expect(await adminRead.json()).toMatchObject({ todoId: todo.id });
  });

  test('invalid todo UUID returns 400', async ({ primaryUserApi }) => {
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/not-a-uuid/checklist`), 400);
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/todos/not-a-uuid/checklist`), 400);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/todos/not-a-uuid/checklist`), 400);
  });

  test('missing todo returns 404', async ({ primaryUserApi }) => {
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${missingUuid}/checklist`), 404);
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/todos/${missingUuid}/checklist`), 404);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/todos/${missingUuid}/checklist/items`, { data: { text: 'missing' } }), 404);
  });
});
