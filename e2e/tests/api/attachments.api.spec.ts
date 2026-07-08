import { readFile } from 'node:fs/promises';

import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../../fixtures/test';
import { uploadFiles, type UploadFile } from '../../data/files';
import { createDraftArticle } from '../../helpers/api/entities/articles-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';

const missingUuid = '00000000-0000-4000-8000-000000000000';
const maxAttachmentSize = 10 * 1024 * 1024;

type AttachmentResponse = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

async function uploadAttachment(api: APIRequestContext, entityType: string, entityId: string, file: UploadFile) {
  const buffer = await readFile(file.path);
  const response = await api.post(`${API_PREFIX}/attachments/${entityType}/${entityId}`, {
    multipart: {
      file: {
        name: file.name,
        mimeType: file.mimeType,
        buffer,
      },
    },
  });

  return { response, size: buffer.length };
}

async function uploadBuffer(
  api: APIRequestContext,
  entityType: string,
  entityId: string,
  file: Pick<UploadFile, 'name' | 'mimeType'>,
  buffer: Buffer,
) {
  return api.post(`${API_PREFIX}/attachments/${entityType}/${entityId}`, {
    multipart: {
      file: {
        name: file.name,
        mimeType: file.mimeType,
        buffer,
      },
    },
  });
}

async function expectUploadedAttachment(response: Awaited<ReturnType<APIRequestContext['post']>>, expected: { mimeType: string; size: number }) {
  await expectStatus(response, 201);
  const body = (await response.json()) as AttachmentResponse;

  expect(body).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      url: expect.any(String),
      mimeType: expected.mimeType,
      size: expected.size,
      createdAt: expect.any(String),
    }),
  );
  expect(body).not.toHaveProperty('s3Key');
  expect(Date.parse(body.createdAt)).not.toBeNaN();

  return body;
}

test.describe('attachments api', () => {
  test('POST /attachments/user/:id uploads jpeg and response includes public metadata', async ({ app, primaryUserApi }) => {
    test.fixme(true, 'BUG: attachments validator rejects valid image/jpeg uploads');

    const { response, size } = await uploadAttachment(primaryUserApi, 'user', app.users.primaryUser.id, uploadFiles.jpeg);
    const attachment = await expectUploadedAttachment(response, { mimeType: uploadFiles.jpeg.mimeType, size });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/attachments/${attachment.id}`), 204);
  });

  test('POST /attachments/article/:id uploads png', async ({ app, writerApi }) => {
    test.fixme(true, 'BUG: attachments validator rejects valid image/png uploads');

    const article = await createDraftArticle(app, 'writer', {
      title: `${app.runId} attachment article`,
      content: `${app.runId} attachment article content`,
    });

    const { response, size } = await uploadAttachment(writerApi, 'article', article.id, uploadFiles.png);
    const attachment = await expectUploadedAttachment(response, { mimeType: uploadFiles.png.mimeType, size });

    await expectStatus(await writerApi.delete(`${API_PREFIX}/attachments/${attachment.id}`), 204);
  });

  test('POST /attachments/todo/:id uploads webp', async ({ app, primaryUserApi }) => {
    test.fixme(true, 'BUG: attachments validator rejects valid image/webp uploads');

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} attachment todo`,
      content: `${app.runId} attachment todo content`,
    });

    const { response, size } = await uploadAttachment(primaryUserApi, 'todo', todo.id, uploadFiles.webp);
    const attachment = await expectUploadedAttachment(response, { mimeType: uploadFiles.webp.mimeType, size });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/attachments/${attachment.id}`), 204);
  });

  test('DELETE /attachments/:id deletes uploaded attachment and second delete returns 404', async ({ app, primaryUserApi }) => {
    test.fixme(true, 'BUG: valid image uploads are rejected, so delete cannot create an attachment yet');

    const { response, size } = await uploadAttachment(primaryUserApi, 'user', app.users.primaryUser.id, uploadFiles.jpeg);
    const attachment = await expectUploadedAttachment(response, { mimeType: uploadFiles.jpeg.mimeType, size });

    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/attachments/${attachment.id}`), 204);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/attachments/${attachment.id}`), 404);
  });

  test('guest upload returns 401', async ({ app, guestApi }) => {
    const { response } = await uploadAttachment(guestApi, 'user', app.users.primaryUser.id, uploadFiles.jpeg);

    await expectStatus(response, 401);
  });

  test('non-image file uploads are rejected', async ({ app, primaryUserApi }) => {
    for (const file of [uploadFiles.text, uploadFiles.pdf, uploadFiles.gif]) {
      const { response } = await uploadAttachment(primaryUserApi, 'user', app.users.primaryUser.id, file);

      await expectStatus(response, 400);
    }
  });

  test('file larger than 10 MB is rejected', async ({ app, primaryUserApi }) => {
    const response = await uploadBuffer(
      primaryUserApi,
      'user',
      app.users.primaryUser.id,
      uploadFiles.jpeg,
      Buffer.alloc(maxAttachmentSize + 1, 1),
    );

    expect([400, 413]).toContain(response.status());
  });

  test('missing file returns 400', async ({ app, primaryUserApi }) => {
    const response = await primaryUserApi.post(`${API_PREFIX}/attachments/user/${app.users.primaryUser.id}`, {
      multipart: {},
    });

    await expectStatus(response, 400);
  });

  test('invalid entity type returns 400', async ({ app, primaryUserApi }) => {
    const { response } = await uploadAttachment(primaryUserApi, 'profile', app.users.primaryUser.id, uploadFiles.jpeg);

    await expectStatus(response, 400);
  });

  test('invalid UUID returns 400', async ({ primaryUserApi }) => {
    const { response } = await uploadAttachment(primaryUserApi, 'user', 'not-a-uuid', uploadFiles.jpeg);

    await expectStatus(response, 400);
    await expectStatus(await primaryUserApi.delete(`${API_PREFIX}/attachments/not-a-uuid`), 400);
  });

  test('missing target returns 404', async ({ primaryUserApi }) => {
    test.fixme(true, 'BUG: valid image upload validation runs before target lookup and currently rejects image/jpeg');

    const { response } = await uploadAttachment(primaryUserApi, 'user', missingUuid, uploadFiles.jpeg);

    await expectStatus(response, 404);
  });

  test('upload to another user protected entity returns 403', async ({ app, primaryUserApi, secondaryUserApi }) => {
    test.fixme(true, 'BUG: valid image upload validation currently rejects image/jpeg before ownership check');

    const todo = await createTodo(app, 'primaryUser', {
      title: `${app.runId} attachment forbidden todo`,
      content: `${app.runId} attachment forbidden todo content`,
    });

    const { response } = await uploadAttachment(secondaryUserApi, 'todo', todo.id, uploadFiles.jpeg);

    await expectStatus(response, 403);
  });
});
