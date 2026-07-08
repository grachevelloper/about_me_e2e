import { test, expect } from '../../fixtures/test';
import { createDraftArticle, listArticles, publishArticle } from '../../helpers/api/entities/articles-api';

test.describe('articles list', () => {
  test('anonymous users see published articles but not drafts', async ({ articlesPage, app }, testInfo) => {
    test.slow();

    const label = `${app.runId}-${testInfo.project.name}`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} hidden draft`,
      content: `${label} hidden draft content`,
    });
    const published = await createDraftArticle(app, 'writer', {
      title: `${label} published article`,
      content: `${label} published article content`,
    });
    await publishArticle(app, published.id, 'writer');

    const articles = await listArticles(label);
    expect(articles.items.map((article) => article.id)).toContain(published.id);
    expect(articles.items.map((article) => article.id)).not.toContain(draft.id);

    await articlesPage.open();
    await articlesPage.expectArticleVisible(published);
    await articlesPage.expectArticleHidden(draft);
  });
});
