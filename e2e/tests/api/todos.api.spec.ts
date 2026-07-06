import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { moveTodoToPublicOwner } from '../../helpers/db';
import { todoPriorities, todoStates, validTodo } from '../../data/todos';

const missingUuid = '00000000-0000-4000-8000-000000000000';

test.describe('todos api', () => {
  test('POST /todos creates todo with required title and content', async ({ app, userAApi }) => {
    const payload = validTodo(app.runId, 'create-required');
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { title: payload.title, content: payload.content } });

    await expectStatus(response, 201);
    expect(await response.json()).toMatchObject({
      title: payload.title,
      content: payload.content,
      authorId: app.users.userA.id,
    });
  });

  for (const priority of todoPriorities) {
    test(`POST /todos accepts priority ${priority}`, async ({ app, userAApi }) => {
      test.fixme(priority === 'High', 'BUG: todo_priority database enum contains Hight instead of High');

      const payload = validTodo(app.runId, `priority-${priority}`);
      const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...payload, priority } });

      await expectStatus(response, 201);
      expect(await response.json()).toMatchObject({ priority });
    });
  }

  for (const state of todoStates) {
    test(`POST /todos accepts state ${state}`, async ({ app, userAApi }) => {
      const payload = validTodo(app.runId, `state-${state}`);
      const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...payload, state } });

      await expectStatus(response, 201);
      expect(await response.json()).toMatchObject({ state });
    });
  }

  test('POST /todos returns 401 for guest', async ({ app, guestApi }) => {
    const response = await guestApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'guest-create') });
    await expectStatus(response, 401);
  });

  test('POST /todos rejects empty title', async ({ app, userAApi }) => {
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...validTodo(app.runId, 'empty-title'), title: '' } });
    await expectStatus(response, 400);
  });

  test('POST /todos rejects empty content', async ({ app, userAApi }) => {
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...validTodo(app.runId, 'empty-content'), content: '' } });
    await expectStatus(response, 400);
  });

  test('POST /todos rejects invalid priority enum', async ({ app, userAApi }) => {
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...validTodo(app.runId, 'bad-priority'), priority: 'Urgent' } });
    await expectStatus(response, 400);
  });

  test('POST /todos rejects invalid state enum', async ({ app, userAApi }) => {
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...validTodo(app.runId, 'bad-state'), state: 'Paused' } });
    await expectStatus(response, 400);
  });

  test('POST /todos rejects unknown fields', async ({ app, userAApi }) => {
    const response = await userAApi.post(`${API_PREFIX}/todos`, { data: { ...validTodo(app.runId, 'unknown-field'), unknownField: 'value' } });
    await expectStatus(response, 400);
  });

  test('GET /todos is public and returns pagination shape', async ({ guestApi }) => {
    const response = await guestApi.get(`${API_PREFIX}/todos`);
    await expectStatus(response, 200);
    const body = await response.json();

    expect(body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        hasNext: expect.any(Boolean),
      }),
    );
  });

  test('GET /todos?page=1&limit=1 returns one item and correct pagination', async ({ app, userAApi, guestApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'public-pagination') });
    await expectStatus(created, 201);
    moveTodoToPublicOwner((await created.json()).id);

    const response = await guestApi.get(`${API_PREFIX}/todos`, { params: { page: 1, limit: 1 } });
    await expectStatus(response, 200);
    const body = await response.json();

    expect(body.items).toHaveLength(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /todos?limit=101 returns 400', async ({ guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/todos`, { params: { limit: 101 } }), 400);
  });

  test('GET /todos?page=0 returns 400', async ({ guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/todos`, { params: { page: 0 } }), 400);
  });

  test('GET /todos/:id is public for existing public todo', async ({ app, userAApi, guestApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'public-read') });
    await expectStatus(created, 201);
    const todo = await created.json();
    moveTodoToPublicOwner(todo.id);

    const response = await guestApi.get(`${API_PREFIX}/todos/${todo.id}`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: todo.id });
  });

  test('GET /todos/:id returns 400 for invalid UUID', async ({ guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/todos/not-a-uuid`), 400);
  });

  test('GET /todos/:id returns 404 for missing UUID', async ({ guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/todos/${missingUuid}`), 404);
  });

  test('PATCH /todos/:id updates title, content, priority, and state', async ({ app, userAApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'patch-all') });
    await expectStatus(created, 201);
    const todo = await created.json();
    const update = {
      title: `${app.runId} updated title`,
      content: `${app.runId} updated content`,
      priority: 'Super',
      state: 'Finished',
    };

    const response = await userAApi.patch(`${API_PREFIX}/todos/${todo.id}`, { data: update });
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject(update);
  });

  test('PATCH /todos/:id returns 401 for guest', async ({ app, userAApi, guestApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'guest-patch') });
    await expectStatus(created, 201);

    const response = await guestApi.patch(`${API_PREFIX}/todos/${(await created.json()).id}`, { data: { title: 'blocked' } });
    await expectStatus(response, 401);
  });

  test('PATCH /todos/:id prevents non-owner mutation', async ({ app, userAApi, userBApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'non-owner-patch') });
    await expectStatus(created, 201);

    const response = await userBApi.patch(`${API_PREFIX}/todos/${(await created.json()).id}`, { data: { title: 'blocked' } });
    await expectStatus(response, 403);
  });

  test('DELETE /todos/:id deletes a todo and deleted todo returns 404', async ({ app, userAApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'delete') });
    await expectStatus(created, 201);
    const todo = await created.json();

    await expectStatus(await userAApi.delete(`${API_PREFIX}/todos/${todo.id}`), 204);
    await expectStatus(await userAApi.get(`${API_PREFIX}/todos/${todo.id}`), 404);
  });

  test('DELETE /todos/:id returns 401 for guest', async ({ app, userAApi, guestApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'guest-delete') });
    await expectStatus(created, 201);

    const response = await guestApi.delete(`${API_PREFIX}/todos/${(await created.json()).id}`);
    await expectStatus(response, 401);
  });

  test('DELETE /todos/:id prevents non-owner deletion', async ({ app, userAApi, userBApi }) => {
    const created = await userAApi.post(`${API_PREFIX}/todos`, { data: validTodo(app.runId, 'non-owner-delete') });
    await expectStatus(created, 201);

    const response = await userBApi.delete(`${API_PREFIX}/todos/${(await created.json()).id}`);
    await expectStatus(response, 403);
  });
});
