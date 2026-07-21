import type { APIRequestContext, APIResponse } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { validArticle } from '../../data/articles';
import { validComment } from '../../data/comments';
import { validTodo } from '../../data/todos';

const missingUuid = '00000000-0000-4000-8000-000000000000';

type EntityLikeType = 'article' | 'todo' | 'comment';

type LikeResponse = {
  id: string;
  entityType: EntityLikeType;
  entityId: string;
  authorId: string;
  createdAt: string;
};

type LikedEntityResponse = {
  id: string;
  likesCount: number;
  hasLiked: boolean;
};

type ArticleResponse = LikedEntityResponse & {
  isDraft: boolean;
};

type TodoResponse = LikedEntityResponse;

type CommentResponse = LikedEntityResponse & {
  entityType: 'article' | 'todo';
  entityId: string;
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

async function createArticleComment(api: APIRequestContext, runId: string, label: string, articleId: string): Promise<CommentResponse> {
  const response = await api.post(`${API_PREFIX}/comments`, {
    data: {
      ...validComment(runId, label),
      entityType: 'article',
      entityId: articleId,
    },
  });
  await expectStatus(response, 201);
  return (await response.json()) as CommentResponse;
}

async function like(api: APIRequestContext, entityType: EntityLikeType, entityId: string): Promise<LikeResponse> {
  const response = await api.post(`${API_PREFIX}/likes/${entityType}/${entityId}`);
  await expectStatus(response, 201);
  return (await response.json()) as LikeResponse;
}

async function expectEntityLikedState(
  response: APIResponse,
  expected: {
    id: string;
    likesCount: number;
    hasLiked: boolean;
  },
): Promise<void> {
  await expectStatus(response, 200);
  expect(await response.json()).toMatchObject(expected);
}

async function expectCommentLikedStateInList(
  api: APIRequestContext,
  articleId: string,
  expected: {
    id: string;
    likesCount: number;
    hasLiked: boolean;
  },
): Promise<void> {
  const response = await api.get(`${API_PREFIX}/comments/article/${articleId}`);
  await expectStatus(response, 200);
  const body = (await response.json()) as { items: CommentResponse[] };
  const comment = body.items.find((item) => item.id === expected.id);

  expect(comment).toMatchObject(expected);
}

test.describe('likes api', () => {
  test('POST and DELETE /likes/article/:id update article likesCount and hasLiked', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'like-article');

    const createdLike = await like(primaryUserApi, 'article', article.id);
    expect(createdLike).toMatchObject({
      entityType: 'article',
      entityId: article.id,
      authorId: app.users.primaryUser.id,
    });
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/articles/${article.id}`), {
      id: article.id,
      likesCount: article.likesCount + 1,
      hasLiked: true,
    });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/article/${article.id}`), 204);
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/articles/${article.id}`), {
      id: article.id,
      likesCount: article.likesCount,
      hasLiked: false,
    });
  });

  test('POST and DELETE /likes/todo/:id update todo likesCount and hasLiked', async ({ app, primaryUserApi }) => {
    const todo = await createTodo(primaryUserApi, app.runId, 'like-todo');

    const createdLike = await like(primaryUserApi, 'todo', todo.id);
    expect(createdLike).toMatchObject({
      entityType: 'todo',
      entityId: todo.id,
      authorId: app.users.primaryUser.id,
    });
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/todos/${todo.id}`), {
      id: todo.id,
      likesCount: todo.likesCount + 1,
      hasLiked: true,
    });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/todo/${todo.id}`), 204);
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/todos/${todo.id}`), {
      id: todo.id,
      likesCount: todo.likesCount,
      hasLiked: false,
    });
  });

  test('POST and DELETE /likes/comment/:id update comment likesCount and hasLiked', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'like-comment-article');
    const comment = await createArticleComment(primaryUserApi, app.runId, 'like-comment', article.id);

    const createdLike = await like(primaryUserApi, 'comment', comment.id);
    expect(createdLike).toMatchObject({
      entityType: 'comment',
      entityId: comment.id,
      authorId: app.users.primaryUser.id,
    });
    await expectCommentLikedStateInList(primaryUserApi, article.id, {
      id: comment.id,
      likesCount: comment.likesCount + 1,
      hasLiked: true,
    });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/comment/${comment.id}`), 204);
    await expectCommentLikedStateInList(primaryUserApi, article.id, {
      id: comment.id,
      likesCount: comment.likesCount,
      hasLiked: false,
    });
  });

  test('GET /comments/:id reflects hasLiked after comment like', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'comment-get-has-liked-article');
    const comment = await createArticleComment(primaryUserApi, app.runId, 'comment-get-has-liked', article.id);

    await like(primaryUserApi, 'comment', comment.id);
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/comments/${comment.id}`), {
      id: comment.id,
      likesCount: comment.likesCount + 1,
      hasLiked: true,
    });
  });

  test('repeated like by same user returns 409 and does not create duplicate', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'duplicate-like');

    await like(primaryUserApi, 'article', article.id);
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/likes/article/${article.id}`), 409);
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/articles/${article.id}`), {
      id: article.id,
      likesCount: article.likesCount + 1,
      hasLiked: true,
    });
  });

  test('unlike without existing like returns 404', async ({ app, writerApi, primaryUserApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'missing-unlike');

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/article/${article.id}`), 404);
    await expectEntityLikedState(await primaryUserApi.get(`${API_PREFIX}/articles/${article.id}`), {
      id: article.id,
      likesCount: article.likesCount,
      hasLiked: false,
    });
  });

  test('guest requests return 401', async ({ app, writerApi, guestApi }) => {
    const article = await createPublishedArticle(writerApi, app.runId, 'guest-like');

    await expectStatus(await guestApi.post(`${API_PREFIX}/likes/article/${article.id}`), 401);
    await expectStatus(await guestApi.delete(`${API_PREFIX}/likes/article/${article.id}`), 401);
  });

  test('invalid entity type returns 400', async ({ primaryUserApi }) => {
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/likes/project/${missingUuid}`), 400);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/project/${missingUuid}`), 400);
  });

  test('invalid UUID returns 400', async ({ primaryUserApi }) => {
    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/likes/article/not-a-uuid`), 400);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/article/not-a-uuid`), 400);
  });

  test('missing entity returns 404', async ({ primaryUserApi }) => {
    for (const entityType of ['article', 'todo', 'comment'] satisfies EntityLikeType[]) {
      await expectStatus(await primaryUserApi.post(`${API_PREFIX}/likes/${entityType}/${missingUuid}`), 404);
      await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/likes/${entityType}/${missingUuid}`), 404);
    }
  });
});
