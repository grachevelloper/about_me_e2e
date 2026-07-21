import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { validArticle } from '../../data/articles';
import { validTag } from '../../data/tags';

const missingUuid = '00000000-0000-4000-8000-000000000000';

type TagResponse = {
  id: string;
  name: string;
};

async function createTag(adminApi: APIRequestContext, runId: string, label: string) {
  const response = await adminApi.post(`${API_PREFIX}/tags`, { data: validTag(runId, label) });
  await expectStatus(response, 201);
  return (await response.json()) as TagResponse;
}

test.describe('tags api', () => {
  test('POST /tags creates tag', async ({ app, adminApi }) => {
    const tag = await createTag(adminApi, app.runId, 'create');

    expect(tag).toMatchObject({
      id: expect.any(String),
      name: expect.stringContaining(`${app.runId}-create`),
    });
  });

  test('GET /tags returns created tag', async ({ app, adminApi }) => {
    const tag = await createTag(adminApi, app.runId, 'list');

    const response = await adminApi.get(`${API_PREFIX}/tags`);
    await expectStatus(response, 200);
    const tags = (await response.json()) as TagResponse[];

    expect(tags.map((item) => item.id)).toContain(tag.id);
  });

  test('PATCH /tags/:id renames tag', async ({ app, adminApi }) => {
    const tag = await createTag(adminApi, app.runId, 'rename');
    const newName = `${app.runId}-renamed-tag`;

    const response = await adminApi.patch(`${API_PREFIX}/tags/${tag.id}`, { data: { name: newName } });
    await expectStatus(response, 200);
    expect(await response.json()).toMatchObject({ id: tag.id, name: newName });
  });

  test('DELETE /tags/:id removes tag', async ({ app, adminApi }) => {
    const tag = await createTag(adminApi, app.runId, 'delete');

    await expectStatus(await adminApi.delete(`${API_PREFIX}/tags/${tag.id}`), 204);
    await expectStatus(await adminApi.patch(`${API_PREFIX}/tags/${tag.id}`, { data: { name: `${app.runId}-after-delete` } }), 404);
  });

  test('empty tag name returns validation error', async ({ adminApi }) => {
    await expectStatus(await adminApi.post(`${API_PREFIX}/tags`, { data: { name: '' } }), 400);
  });

  test('duplicate tag name returns conflict', async ({ app, adminApi }) => {
    const tag = await createTag(adminApi, app.runId, 'duplicate');

    await expectStatus(await adminApi.post(`${API_PREFIX}/tags`, { data: { name: tag.name.toUpperCase() } }), 409);
  });

  test('invalid UUID returns 400', async ({ adminApi }) => {
    await expectStatus(await adminApi.patch(`${API_PREFIX}/tags/not-a-uuid`, { data: { name: 'bad' } }), 400);
    await expectStatus(await adminApi.delete(`${API_PREFIX}/tags/not-a-uuid`), 400);
  });

  test('missing tag returns 404', async ({ adminApi }) => {
    await expectStatus(await adminApi.patch(`${API_PREFIX}/tags/${missingUuid}`, { data: { name: 'missing' } }), 404);
    await expectStatus(await adminApi.delete(`${API_PREFIX}/tags/${missingUuid}`), 404);
  });

  test('deleting tag used by article removes tag and keeps article readable', async ({ app, writerApi, adminApi, guestApi }) => {

    const tagName = `${app.runId}-used-tag`;
    const createdArticle = await writerApi.post(`${API_PREFIX}/articles`, {
      data: { ...validArticle(app.runId, 'tagged-article'), tags: [{ name: tagName }] },
    });
    await expectStatus(createdArticle, 201);
    const draft = await createdArticle.json();
    await expectStatus(await writerApi.post(`${API_PREFIX}/articles/${draft.id}/publish`), 201);

    const tagsResponse = await adminApi.get(`${API_PREFIX}/tags`);
    await expectStatus(tagsResponse, 200);
    const usedTag = ((await tagsResponse.json()) as TagResponse[]).find((tag) => tag.name === tagName);
    expect(usedTag).toBeTruthy();

    await expectStatus(await adminApi.delete(`${API_PREFIX}/tags/${usedTag!.id}`), 204);

    const articleResponse = await guestApi.get(`${API_PREFIX}/articles/${draft.id}`);
    await expectStatus(articleResponse, 200);
    expect(await articleResponse.json()).toMatchObject({ id: draft.id, tags: [] });
  });

  test('tag mutation endpoints require auth', async ({ guestApi }) => {
    await expectStatus(await guestApi.post(`${API_PREFIX}/tags`, { data: { name: 'guest-tag' } }), 401);
    await expectStatus(await guestApi.patch(`${API_PREFIX}/tags/${missingUuid}`, { data: { name: 'guest-tag' } }), 401);
    await expectStatus(await guestApi.delete(`${API_PREFIX}/tags/${missingUuid}`), 401);
  });
});
