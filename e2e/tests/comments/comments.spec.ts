import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createComment } from '../../helpers/api/entities/comments-api';

test.describe('comments', () => {
  test('authenticated user can create an article root comment through API', async ({ app }) => {
    const draft = await createDraftArticle(app, 'writer', {
      title: `${app.runId} comment article`,
      content: `${app.runId} comment article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');

    const comment = await createComment(app, 'article', article.id, 'primaryUser');

    expect(comment.entityId).toBe(article.id);
    expect(comment.parentId).toBeNull();
  });
});
