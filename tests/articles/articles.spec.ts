import { test, expect } from '../../fixtures/test';
import { createDraftArticle, listArticles, publishArticle } from '../../helpers/articles-api';

test.describe('articles list', () => {
  test('anonymous users see published articles but not drafts', async ({ articlesPage, app }) => {
    const draft = await createDraftArticle(app, 'writerA', {
      title: `${app.runId} hidden draft`,
      content: `${app.runId} hidden draft content`,
    });
    const published = await createDraftArticle(app, 'writerA', {
      title: `${app.runId} published article`,
      content: `${app.runId} published article content`,
    });
    await publishArticle(app, published.id, 'writerA');

    const articles = await listArticles(app.runId);
    expect(articles.items.map((article) => article.id)).toContain(published.id);
    expect(articles.items.map((article) => article.id)).not.toContain(draft.id);

    await articlesPage.open();
    await articlesPage.expectArticleVisible(published);
    await articlesPage.expectArticleHidden(draft);
  });
});
