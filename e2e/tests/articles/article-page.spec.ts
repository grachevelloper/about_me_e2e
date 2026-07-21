import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle, updateArticle } from '../../helpers/api/entities/articles-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { ArticlePage } from '../../pages/articles/ArticlePage';

test.describe('article page', () => {
  test('published article renders title, image, tags, read time, dates, and content for guest', async ({ articlePage, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-full`;
    const tagName = `${label}-tag`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} public article`,
      content: `${label} public article content`,
      readTime: 6,
      tags: [{ name: tagName }],
    });
    await updateArticle(app, draft.id, 'writer', { image: 'https://example.com/public-article.png' });
    const article = await publishArticle(app, draft.id, 'writer');

    await articlePage.open(article.id);
    await articlePage.expectOpened(article.id);
    await articlePage.expectArticleVisible(article);
    await articlePage.expectImageVisible(article);
    await articlePage.expectTagVisible(tagName);
    await articlePage.expectReadTimeVisible(6);
    await articlePage.expectDatesVisible();
  });

  test('guest can open published article but does not see new comment form', async ({ articlePage, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-guest`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} guest article`,
      content: `${label} guest article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');

    await articlePage.open(article.id);
    await articlePage.expectOpened(article.id);
    await articlePage.expectArticleVisible(article);
    await articlePage.expectCommentFormHidden();
  });

  test('authenticated user sees new comment form', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-comment-form`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.expectCommentFormVisible();

    await session.close();
  });

  test('authenticated user can like and unlike article; count and aria-pressed update', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-like`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.expectLikeState(0, false);

    await session.articlePage.like();
    await session.articlePage.expectLikeState(1, true);

    await session.articlePage.like();
    await session.articlePage.expectLikeState(0, false);

    await session.close();
  });

  test('missing article redirects or renders not-found state', async ({ articlePage, errorPage, page }) => {

    const missingUuid = '00000000-0000-4000-8000-000000000000';

    await articlePage.open(missingUuid);

    await expect(page).toHaveURL(/\/not-found|\/404|\/articles\/00000000-0000-4000-8000-000000000000/);
    await errorPage.expectNotFound();
  });
});
