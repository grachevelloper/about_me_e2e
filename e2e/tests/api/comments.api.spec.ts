import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { validArticle } from '../../data/articles';
import { validComment } from '../../data/comments';
import { validTodo } from '../../data/todos';

const missingUuid = '00000000-0000-4000-8000-000000000000';

type EntityType = 'article' | 'todo';

type ArticleResponse = {
  id: string;
  isDraft: boolean;
};

type TodoResponse = {
  id: string;
};

type CommentResponse = {
  id: string;
  content: string;
  entityType: EntityType;
  entityId: string;
  parentId: string | null;
  depth: number;
  likesCount: number;
  hasLiked: boolean;
};

type PaginatedComments = {
  items: CommentResponse[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
};

async function createPublishedArticle(api: APIRequestContext, runId: string, label: string): Promise<ArticleResponse> {
  const draftResponse = await api.post(`${API_PREFIX}/articles`, { data: validArticle(runId, label) });
  await expectStatus(draftResponse, 201);
  const draft = (await draftResponse.json()) as ArticleResponse;

  const publishResponse = await api.post(`${API_PREFIX}/articles/${draft.id}/publish`);
  await expectStatus(publishResponse, 201);
  return (await publishResponse.json()) as ArticleResponse;
}

async function createTodo(api: APIRequestContext, runId: string, label: string): Promise<TodoResponse> {
  const response = await api.post(`${API_PREFIX}/todos`, { data: validTodo(runId, label) });
  await expectStatus(response, 201);
  return (await response.json()) as TodoResponse;
}

async function createComment(
  api: APIRequestContext,
  runId: string,
  label: string,
  entityType: EntityType,
  entityId: string,
  parentId?: string,
): Promise<CommentResponse> {
  const response = await api.post(`${API_PREFIX}/comments`, {
    data: {
      ...validComment(runId, label),
      entityType,
      entityId,
      parentId,
    },
  });
  await expectStatus(response, 201);
  return (await response.json()) as CommentResponse;
}

async function expectPaginatedComments(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<PaginatedComments> {
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

  return body as PaginatedComments;
}

test.describe('comments api', () => {
  test('POST /comments creates root comment for article', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-article-root');
    const comment = await createComment(primaryUserApi, app.runId, 'article-root', 'article', article.id);

    expect(comment).toMatchObject({
      content: expect.stringContaining('article-root'),
      entityType: 'article',
      entityId: article.id,
      parentId: null,
      depth: 0,
      likesCount: 0,
      hasLiked: false,
    });
  });

  test('POST /comments creates root comment for todo', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'comment-todo-root');
    const comment = await createComment(primaryUserApi, app.runId, 'todo-root', 'todo', todo.id);

    expect(comment).toMatchObject({
      content: expect.stringContaining('todo-root'),
      entityType: 'todo',
      entityId: todo.id,
      parentId: null,
      depth: 0,
    });
  });

  test('POST /comments creates reply with parentId and correct depth', async ({ app, writerApi, primaryUserApi, secondaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-reply');
    const parent = await createComment(primaryUserApi, app.runId, 'reply-parent', 'article', article.id);
    const reply = await createComment(secondaryUserApi, app.runId, 'reply-child', 'article', article.id, parent.id);

    expect(reply).toMatchObject({
      entityType: 'article',
      entityId: article.id,
      parentId: parent.id,
      depth: parent.depth + 1,
    });
  });

  test('GET /comments/:id returns created comment', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-read');
    const comment = await createComment(primaryUserApi, app.runId, 'read-by-id', 'article', article.id);

    const response = await primaryUserApi.get(`${API_PREFIX}/comments/${comment.id}`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: comment.id, content: comment.content });
  });

  test('GET /comments/:entityType/:entityId lists article comments', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-list-article');
    const comment = await createComment(primaryUserApi, app.runId, 'list-article', 'article', article.id);

    const body = await expectPaginatedComments(await primaryUserApi.get(`${API_PREFIX}/comments/article/${article.id}`));
    expect(body.items.map((item) => item.id)).toContain(comment.id);
  });

  test('GET /comments/:entityType/:entityId lists todo comments', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'comment-list-todo');
    const comment = await createComment(primaryUserApi, app.runId, 'list-todo', 'todo', todo.id);

    const body = await expectPaginatedComments(await primaryUserApi.get(`${API_PREFIX}/comments/todo/${todo.id}`));
    expect(body.items.map((item) => item.id)).toContain(comment.id);
  });

  test('GET /comments/:entityType/:entityId supports ASC and DESC order', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-order');
    const first = await createComment(primaryUserApi, app.runId, 'order-first', 'article', article.id);
    const second = await createComment(primaryUserApi, app.runId, 'order-second', 'article', article.id);

    const asc = await expectPaginatedComments(await primaryUserApi.get(`${API_PREFIX}/comments/article/${article.id}`, { params: { order: 'ASC' } }));
    const desc = await expectPaginatedComments(await primaryUserApi.get(`${API_PREFIX}/comments/article/${article.id}`, { params: { order: 'DESC' } }));

    expect(asc.items.map((item) => item.id).slice(0, 2)).toEqual([first.id, second.id]);
    expect(desc.items.map((item) => item.id).slice(0, 2)).toEqual([second.id, first.id]);
  });

  test('GET /comments/:entityType/:entityId supports page and limit', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-pagination');
    await createComment(primaryUserApi, app.runId, 'pagination-one', 'article', article.id);
    await createComment(primaryUserApi, app.runId, 'pagination-two', 'article', article.id);

    const body = await expectPaginatedComments(
      await primaryUserApi.get(`${API_PREFIX}/comments/article/${article.id}`, { params: { page: 1, limit: 1, order: 'ASC' } }),
    );

    expect(body.items).toHaveLength(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  test('PATCH /comments/:id lets author edit', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-edit');
    const comment = await createComment(primaryUserApi, app.runId, 'edit-before', 'article', article.id);
    const updatedContent = `${app.runId} edit-after ${Date.now()}`;

    const response = await primaryUserApi.patch(`${API_PREFIX}/comments/${comment.id}`, { data: { content: updatedContent } });
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: comment.id, content: updatedContent });
  });

  test('DELETE /comments/:id lets author delete', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-delete');
    const comment = await createComment(primaryUserApi, app.runId, 'delete-author', 'article', article.id);

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/comments/${comment.id}`), 204);
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/comments/${comment.id}`), 404);
  });

  test('DELETE /comments/:id lets admin delete another user comment', async ({ app, writerApi, primaryUserApi, adminApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-admin-delete');
    const comment = await createComment(primaryUserApi, app.runId, 'delete-admin', 'article', article.id);

    await expectStatus(await adminApi.delete(`${API_PREFIX}/comments/${comment.id}`), 204);
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/comments/${comment.id}`), 404);
  });

  test('comment mutation requests require auth', async ({ app, writerApi, primaryUserApi, guestApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-guest');
    const comment = await createComment(primaryUserApi, app.runId, 'guest-guard', 'article', article.id);

    await expectStatus(await guestApi.post(`${API_PREFIX}/comments`, { data: { ...validComment(app.runId, 'guest-create'), entityType: 'article', entityId: article.id } }), 401);
    await expectStatus(await guestApi.patch(`${API_PREFIX}/comments/${comment.id}`, { data: { content: 'blocked' } }), 401);
    await expectStatus(await guestApi.delete(`${API_PREFIX}/comments/${comment.id}`), 401);
  });

  test('POST /comments returns 400 for empty content', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-empty');

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/comments`, { data: { content: '', entityType: 'article', entityId: article.id } }), 400);
  });

  test('POST /comments returns 400 for invalid entityType', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-invalid-entity-type');

    await expectStatus(
      await primaryUserApi.post(`${API_PREFIX}/comments`, {
        data: { ...validComment(app.runId, 'invalid-entity-type'), entityType: 'project', entityId: article.id },
      }),
      400,
    );
  });

  test('invalid UUIDs return 400', async ({ app, primaryUserApi }) => {
    await expectStatus(
      await primaryUserApi.post(`${API_PREFIX}/comments`, {
        data: { ...validComment(app.runId, 'invalid-entity-id'), entityType: 'article', entityId: 'not-a-uuid' },
      }),
      400,
    );
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/comments/not-a-uuid`), 400);
    await expectStatus(await primaryUserApi.patch(`${API_PREFIX}/comments/not-a-uuid`, { data: { content: 'bad' } }), 400);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/comments/not-a-uuid`), 400);
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/comments/article/not-a-uuid`), 400);
  });

  test('missing comment returns 404', async ({ primaryUserApi }) => {
    await expectStatus(await primaryUserApi.get(`${API_PREFIX}/comments/${missingUuid}`), 404);
    await expectStatus(await primaryUserApi.patch(`${API_PREFIX}/comments/${missingUuid}`, { data: { content: 'missing' } }), 404);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/comments/${missingUuid}`), 404);
  });

  test('PATCH and DELETE /comments/:id prevent non-author mutation', async ({ app, writerApi, primaryUserApi, secondaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-non-author');
    const patchTarget = await createComment(primaryUserApi, app.runId, 'non-author-patch', 'article', article.id);
    const deleteTarget = await createComment(primaryUserApi, app.runId, 'non-author-delete', 'article', article.id);

    await expectStatus(await secondaryUserApi.patch(`${API_PREFIX}/comments/${patchTarget.id}`, { data: { content: 'blocked' } }), 403);
    await expectStatus(await secondaryUserApi.delete(`${API_PREFIX}/comments/${deleteTarget.id}`), 403);
  });

  test('POST /comments rejects parent comment from another entity', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-parent-source');
    const todo = await createTodo(primaryUserApi, app.runId, 'comment-parent-target');
    const parent = await createComment(primaryUserApi, app.runId, 'cross-entity-parent', 'article', article.id);

    await expectStatus(
      await primaryUserApi.post(`${API_PREFIX}/comments`, {
        data: {
          ...validComment(app.runId, 'cross-entity-reply'),
          entityType: 'todo',
          entityId: todo.id,
          parentId: parent.id,
        },
      }),
      400,
    );
  });
});
