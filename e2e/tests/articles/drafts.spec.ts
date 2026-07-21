import { test, expect } from '../../fixtures/test';
import { createDraftArticle } from '../../helpers/api/entities/articles-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { DraftsPage } from '../../pages/articles/DraftsPage';

test.describe('article drafts list', () => {
  test('writer and admin can open drafts page', async ({ browser, app }) => {
    for (const role of ['writer', 'admin'] as const) {
      const session = await createAuthenticatedPage(browser, app, role, (page) => ({
        draftsPage: new DraftsPage(page),
      }));

      await session.draftsPage.open();
      await session.draftsPage.expectOpened();

      await session.close();
    }
  });

  test('guest and ordinary user cannot open drafts page', async ({ browser, app, page }) => {

    await page.goto('/articles/drafts');
    await expect(page).not.toHaveURL(/\/articles\/drafts$/);

    const ordinary = await createAuthenticatedPage(browser, app, 'primaryUser', (ordinaryPage) => ({
      draftsPage: new DraftsPage(ordinaryPage),
    }));

    await ordinary.draftsPage.open();
    await expect(ordinary.page).not.toHaveURL(/\/articles\/drafts$/);

    await ordinary.close();
  });

  test('drafts list shows own drafts and hides another writer drafts', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-drafts`;
    const ownDraft = await createDraftArticle(app, 'writer', {
      title: `${label} own draft`,
      content: `${label} own content`,
    });
    const otherDraft = await createDraftArticle(app, 'secondaryWriter', {
      title: `${label} other draft`,
      content: `${label} other content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftsPage: new DraftsPage(page),
    }));

    await session.draftsPage.open();
    await session.draftsPage.expectDraftVisible(ownDraft);
    await session.draftsPage.expectDraftHidden(otherDraft);

    await session.close();
  });

  test('clicking a draft opens editor', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-open`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} clickable draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftsPage: new DraftsPage(page),
    }));

    await session.draftsPage.open();
    await session.draftsPage.clickDraft(draft);

    await expect(session.page).toHaveURL(new RegExp(`/articles/draft/${draft.id}$`));

    await session.close();
  });
});
