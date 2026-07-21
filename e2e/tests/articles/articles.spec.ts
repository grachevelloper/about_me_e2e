import { test, expect } from '../../fixtures/test';
import { createDraftArticle, listArticles, publishArticle } from '../../helpers/api/entities/articles-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { ArticlesPage } from '../../pages/articles/ArticlesPage';

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

  test('clicking a published article card opens the public article route', async ({ page, articlesPage, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-open`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} published card`,
      content: `${label} published card content`,
    });
    const published = await publishArticle(app, draft.id, 'writer');

    await articlesPage.open();
    await articlesPage.clickArticle(published);

    await expect(page).toHaveURL(new RegExp(`/articles/${published.id}$`));
  });

  test('empty article list renders an empty state', async ({ page, articlesPage }) => {
    await page.route('**/api/articles', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], page: 1, limit: 10, total: 0, hasNext: false }),
      }),
    );

    await articlesPage.open();
    await articlesPage.expectEmptyStateVisible();
  });

  test('loading article list renders skeleton cards while the route is pending', async ({ page, articlesPage }) => {
    await page.route('**/api/articles', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], page: 1, limit: 10, total: 0, hasNext: false }),
      });
    });

    await articlesPage.open();
    await articlesPage.expectSkeletonsVisible();
  });

  test('writer and admin see create article button; guest and ordinary user do not', async ({ browser, app, articlesPage }) => {
    await articlesPage.open();
    await articlesPage.expectCreateArticleHidden();

    const ordinary = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlesPage: new ArticlesPage(page),
    }));
    await ordinary.articlesPage.open();
    await ordinary.articlesPage.expectCreateArticleHidden();
    await ordinary.close();

    for (const role of ['writer', 'admin'] as const) {
      const session = await createAuthenticatedPage(browser, app, role, (page) => ({
        articlesPage: new ArticlesPage(page),
      }));
      await session.articlesPage.open();
      await session.articlesPage.expectCreateArticleVisible();
      await session.close();
    }
  });

  test('create article button creates a draft and opens the editor', async ({ browser, app }) => {

    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      articlesPage: new ArticlesPage(page),
    }));

    await session.articlesPage.open();
    await session.articlesPage.createArticle();

    await expect(session.page).toHaveURL(/\/articles\/draft\/[0-9a-f-]+$/);

    await session.close();
  });

  test('draft article card click opens the editor for the author', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-draft-card`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} visible draft`,
      content: `${label} draft card content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      articlesPage: new ArticlesPage(page),
    }));

    await session.articlesPage.open();
    await session.articlesPage.clickArticle(draft);

    await expect(session.page).toHaveURL(new RegExp(`/articles/draft/${draft.id}$`));

    await session.close();
  });

  test('search input filters articles by query', async ({ articlesPage, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-search`;
    const needle = await publishArticle(
      app,
      (
        await createDraftArticle(app, 'writer', {
          title: `${label} needle`,
          content: `${label} needle content`,
        })
      ).id,
      'writer',
    );
    const haystack = await publishArticle(
      app,
      (
        await createDraftArticle(app, 'writer', {
          title: `${label} haystack`,
          content: `${label} haystack content`,
        })
      ).id,
      'writer',
    );

    await articlesPage.open();
    await articlesPage.search(needle.title);

    const articles = await listArticles(needle.title);
    expect(articles.items.map((article) => article.id)).toContain(needle.id);
    await articlesPage.expectArticleVisible(needle);
    await articlesPage.expectArticleHidden(haystack);
  });
});
