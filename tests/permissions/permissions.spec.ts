import { test, expect } from '../../fixtures/test';
import { createDraftArticle } from '../../helpers/articles-api';
import { API_PREFIX, newApiContext } from '../../helpers/api';

test.describe('permissions', () => {
  test('anonymous user cannot read drafts endpoint', async () => {
    const api = await newApiContext();

    try {
      const response = await api.get(`${API_PREFIX}/articles/drafts`);
      expect(response.status()).toBe(401);
    } finally {
      await api.dispose();
    }
  });

  test('another writer cannot edit writer draft', async ({ app }) => {
    const draft = await createDraftArticle(app, 'writerA', {
      title: `${app.runId} writer ownership`,
      content: `${app.runId} writer ownership content`,
    });
    const api = await newApiContext({ storageState: app.users.writerB.storageStatePath });

    try {
      const response = await api.patch(`${API_PREFIX}/articles/${draft.id}`, {
        data: { title: `${app.runId} stolen title` },
      });

      expect(response.status()).toBe(403);
    } finally {
      await api.dispose();
    }
  });
});
