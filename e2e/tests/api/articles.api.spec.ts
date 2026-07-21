import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { validArticle } from '../../data/articles';

const missingUuid = '00000000-0000-4000-8000-000000000000';

type ArticleResponse = {
  id: string;
  title: string;
  content: string;
  image: string;
  readTime: number | null;
  isDraft: boolean;
  likesCount: number;
  hasLiked: boolean;
  author: { id: string };
  tags: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

async function createDraft(api: APIRequestContext, runId: string, label: string, overrides: Record<string, unknown> = {}) {
  const response = await api.post(`${API_PREFIX}/articles`, {
    data: {
      ...validArticle(runId, label),
      ...overrides,
    },
  });
  await expectStatus(response, 201);
  return (await response.json()) as ArticleResponse;
}

async function publish(api: APIRequestContext, articleId: string) {
  const response = await api.post(`${API_PREFIX}/articles/${articleId}/publish`);
  await expectStatus(response, 201);
  return (await response.json()) as ArticleResponse;
}

async function createPublished(api: APIRequestContext, runId: string, label: string, overrides: Record<string, unknown> = {}) {
  const draft = await createDraft(api, runId, label, overrides);
  return publish(api, draft.id);
}

async function expectPaginatedArticles(response: Awaited<ReturnType<APIRequestContext['get']>>) {
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

  return body as { items: ArticleResponse[]; page: number; limit: number; total: number; hasNext: boolean };
}

test.describe('articles api', () => {
  test('POST /articles creates a draft for writer', async ({ app, writerApi }) => {
    const article = await createDraft(writerApi, app.runId, 'writer-create');

    expect(article).toMatchObject({
      title: expect.stringContaining('writer-create'),
      content: expect.stringContaining('writer-create content'),
      readTime: 3,
      isDraft: true,
      author: { id: app.users.writer.id },
    });
  });

  test('POST /articles creates a draft for admin', async ({ app, adminApi }) => {
    const article = await createDraft(adminApi, app.runId, 'admin-create');

    expect(article).toMatchObject({
      title: expect.stringContaining('admin-create'),
      isDraft: true,
      author: { id: app.users.admin.id },
    });
  });

  test('POST /articles prevents guest', async ({ app, guestApi }) => {
    await expectStatus(await guestApi.post(`${API_PREFIX}/articles`, { data: validArticle(app.runId, 'guest-create') }), 401);
  });

  test('POST /articles prevents ordinary user if write role is required', async ({ app, primaryUserApi }) => {

    await expectStatus(await primaryUserApi.post(`${API_PREFIX}/articles`, { data: validArticle(app.runId, 'user-create') }), 403);
  });

  test('POST /articles rejects empty title', async ({ app, writerApi }) => {
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles`, { data: { ...validArticle(app.runId, 'empty-title'), title: '' } }), 400);
  });

  test('POST /articles rejects empty content', async ({ app, writerApi }) => {
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles`, { data: { ...validArticle(app.runId, 'empty-content'), content: '' } }), 400);
  });

  test('POST /articles rejects readTime less than 1', async ({ app, writerApi }) => {
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles`, { data: { ...validArticle(app.runId, 'bad-read-time'), readTime: 0 } }), 400);
  });

  test('POST /articles accepts tags array', async ({ app, writerApi }) => {
    const article = await createDraft(writerApi, app.runId, 'tags-create', {
      tags: [{ name: `${app.runId}-Article-Tag` }, { name: `${app.runId}-second-tag` }],
    });

    expect(article.tags.map((tag) => tag.name).sort()).toEqual([`${app.runId}-article-tag`, `${app.runId}-second-tag`].sort());
  });

  test('GET /articles is public and returns pagination shape', async ({ guestApi }) => {
    await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`));
  });

  test('GET /articles returns published articles and does not return drafts', async ({ app, writerApi, guestApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'hidden-draft');
    const published = await createPublished(writerApi, app.runId, 'visible-published');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: app.runId, limit: 100 } }));
    const ids = body.items.map((article) => article.id);

    expect(ids).toContain(published.id);
    expect(ids).not.toContain(draft.id);
  });

  test('GET /articles supports pagination', async ({ app, writerApi, guestApi }) => {
    await createPublished(writerApi, app.runId, 'pagination-one');
    await createPublished(writerApi, app.runId, 'pagination-two');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: app.runId, page: 1, limit: 1 } }));
    expect(body.items).toHaveLength(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  test('GET /articles supports search', async ({ app, writerApi, guestApi }) => {
    const article = await createPublished(writerApi, app.runId, 'search-needle');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: 'search-needle' } }));
    expect(body.items.map((item) => item.id)).toContain(article.id);
  });

  test('GET /articles supports authorId', async ({ app, writerApi, guestApi }) => {
    const article = await createPublished(writerApi, app.runId, 'author-filter');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { authorId: app.users.writer.id, search: 'author-filter' } }));
    expect(body.items.map((item) => item.id)).toContain(article.id);
    expect(body.items.every((item) => item.author.id === app.users.writer.id)).toBe(true);
  });

  test('GET /articles supports comma-separated tags', async ({ app, writerApi, guestApi }) => {
    const tagName = `${app.runId}-filter-tag`;
    const article = await createPublished(writerApi, app.runId, 'tag-filter', { tags: [{ name: tagName }] });

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { tags: tagName } }));
    expect(body.items.map((item) => item.id)).toContain(article.id);
  });

  test('GET /articles supports minLikes', async ({ app, writerApi, guestApi }) => {
    const article = await createPublished(writerApi, app.runId, 'min-likes');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: 'min-likes', minLikes: 0 } }));
    expect(body.items.map((item) => item.id)).toContain(article.id);
  });

  test('GET /articles supports createdAfter', async ({ app, writerApi, guestApi }) => {
    const createdAfter = new Date(Date.now() - 60_000).toISOString();
    const article = await createPublished(writerApi, app.runId, 'created-after');

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: 'created-after', createdAfter } }));
    expect(body.items.map((item) => item.id)).toContain(article.id);
  });

  test('GET /articles supports sortBy createdAt and updatedAt with ASC and DESC order', async ({ app, writerApi, guestApi }) => {
    await createPublished(writerApi, app.runId, 'sort-created');

    for (const sortBy of ['createdAt', 'updatedAt']) {
      for (const order of ['ASC', 'DESC']) {
        const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: 'sort-created', sortBy, order } }));
        expect(body.items.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('GET /articles/drafts returns writer own drafts', async ({ app, writerApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'own-draft');

    const response = await writerApi.get(`${API_PREFIX}/articles/drafts`);
    await expectStatus(response, 200);
    const drafts = (await response.json()) as ArticleResponse[];
    expect(drafts.map((article) => article.id)).toContain(draft.id);
    expect(drafts.every((article) => article.author.id === app.users.writer.id)).toBe(true);
  });

  test('GET /articles/drafts returns 401 for guest', async ({ guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/articles/drafts`), 401);
  });

  test('GET /articles/author/:authorId is public', async ({ app, writerApi, guestApi }) => {
    const article = await createPublished(writerApi, app.runId, 'author-public');

    const response = await guestApi.get(`${API_PREFIX}/articles/author/${app.users.writer.id}`);
    await expectStatus(response, 200);
    const articles = (await response.json()) as ArticleResponse[];
    expect(articles.map((item) => item.id)).toContain(article.id);
  });

  test('GET /articles/:id returns published article for guest', async ({ app, writerApi, guestApi }) => {
    const article = await createPublished(writerApi, app.runId, 'guest-read');

    const response = await guestApi.get(`${API_PREFIX}/articles/${article.id}`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: article.id, isDraft: false });
  });

  test('GET /articles/:id returns own draft for author', async ({ app, writerApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'own-draft-read');

    const response = await writerApi.get(`${API_PREFIX}/articles/${draft.id}`);
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: draft.id, isDraft: true });
  });

  test('GET /articles/:id prevents another writer from reading private draft', async ({ app, writerApi, secondaryWriterApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'other-draft-read');

    await expectStatus(await secondaryWriterApi.get(`${API_PREFIX}/articles/${draft.id}`), 403);
  });

  test('PATCH /articles/:id updates title, content, image, readTime, and tags', async ({ app, writerApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'patch-all');
    const update = {
      title: `${app.runId} updated article title`,
      content: `${app.runId} updated article content`,
      image: 'https://example.com/article.png',
      readTime: 7,
      tags: [{ name: `${app.runId}-updated-tag` }],
    };

    const response = await writerApi.patch(`${API_PREFIX}/articles/${draft.id}`, { data: update });
    await expectStatus(response, 200);
    const body = (await response.json()) as ArticleResponse;

    expect(body).toMatchObject({
      title: update.title,
      content: update.content,
      image: update.image,
      readTime: update.readTime,
    });
    expect(body.tags.map((tag) => tag.name)).toEqual([`${app.runId}-updated-tag`]);
  });

  test('PATCH /articles/:id rejects invalid image URL', async ({ app, writerApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'bad-image');

    await expectStatus(await writerApi.patch(`${API_PREFIX}/articles/${draft.id}`, { data: { image: 'not-a-url' } }), 400);
  });

  test('PATCH /articles/:id prevents another writer from editing draft', async ({ app, writerApi, secondaryWriterApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'other-edit');

    await expectStatus(await secondaryWriterApi.patch(`${API_PREFIX}/articles/${draft.id}`, { data: { title: 'blocked' } }), 403);
  });

  test('POST /articles/:id/publish publishes draft and published draft appears in GET /articles', async ({ app, writerApi, guestApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'publish');

    const published = await publish(writerApi, draft.id);
    expect(published).toMatchObject({ id: draft.id, isDraft: false });

    const body = await expectPaginatedArticles(await guestApi.get(`${API_PREFIX}/articles`, { params: { search: 'publish' } }));
    expect(body.items.map((item) => item.id)).toContain(draft.id);
  });

  test('DELETE /articles/:id deletes own article and deleted article returns 404', async ({ app, writerApi }) => {
    const draft = await createDraft(writerApi, app.runId, 'delete');

    await expectStatus(await writerApi.delete(`${API_PREFIX}/articles/${draft.id}`), 204);
    await expectStatus(await writerApi.get(`${API_PREFIX}/articles/${draft.id}`), 404);
  });

  test('invalid UUID path params return 400', async ({ writerApi, guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/articles/not-a-uuid`), 400);
    await expectStatus(await writerApi.patch(`${API_PREFIX}/articles/not-a-uuid`, { data: { title: 'bad' } }), 400);
    await expectStatus(await writerApi.delete(`${API_PREFIX}/articles/not-a-uuid`), 400);
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles/not-a-uuid/publish`), 400);
  });

  test('missing article returns 404', async ({ writerApi, guestApi }) => {
    await expectStatus(await guestApi.get(`${API_PREFIX}/articles/${missingUuid}`), 404);
    await expectStatus(await writerApi.patch(`${API_PREFIX}/articles/${missingUuid}`, { data: { title: 'missing' } }), 404);
    await expectStatus(await writerApi.delete(`${API_PREFIX}/articles/${missingUuid}`), 404);
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles/${missingUuid}/publish`), 404);
  });
});
