import { test, expect } from '../../fixtures/test';
import { createDraftArticle, getArticle, publishArticle, updateArticle } from '../../helpers/api/entities/articles-api';
import { API_PREFIX } from '../../helpers/api/client';
import { expectStatus } from '../../helpers/assertions/status';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { ArticlesPage } from '../../pages/articles/ArticlesPage';

test.describe('article editor', () => {
  test('writer can open own draft editor', async ({ browser, app }, testInfo) => {
    test.slow();

    const label = `${app.runId}-${testInfo.project.name}`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} editor draft`,
      content: `${label} editor draft content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.expectOpened(draft.id);
    await session.draftEditorPage.expectTitleVisible(draft.title);

    await session.close();
  });

  test('editor renders title, content, tags, image, and readTime', async ({ browser, app, adminApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-render`;
    const tagName = `${label}-tag`;
    await expectStatus(await adminApi.post(`${API_PREFIX}/tags`, { data: { name: tagName } }), 201);
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} render draft`,
      content: `${label} render content`,
      readTime: 8,
      tags: [{ name: tagName }],
    });
    const article = await updateArticle(app, draft.id, 'writer', { image: 'https://example.com/render.png' });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.expectEditorFieldsVisible(article);
    await session.draftEditorPage.expectTagVisible(tagName);

    await session.close();
  });

  test('title autosaves after debounce and persists after reload', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-title`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} original`,
      content: `${label} content`,
    });
    const nextTitle = `${label} updated title`;
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateTitle(nextTitle);
    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).title, { timeout: 8_000 })
      .toBe(nextTitle);

    await session.page.reload();
    await session.draftEditorPage.expectTitleVisible(nextTitle);

    await session.close();
  });

  test('MD editor content autosaves after debounce and persists after reload', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-content`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} original content`,
    });
    const nextContent = `${label} **updated** content`;
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateContent(nextContent);
    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).content, { timeout: 8_000 })
      .toBe(nextContent);

    await session.page.reload();
    await expect(session.draftEditorPage.contentEditor).toContainText('updated');

    await session.close();
  });

  test('image URL autosaves and valid image preview appears', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-image`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const image = 'https://example.com/article-cover.png';
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateImage(image);
    await session.draftEditorPage.expectImagePreviewVisible(draft.title);
    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).image, { timeout: 8_000 })
      .toBe(image);

    await session.page.reload();
    await expect(session.draftEditorPage.imageInput).toHaveValue(image);

    await session.close();
  });

  test('readTime autosaves and enforces minimum 1', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-read-time`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateReadTime(0);
    await session.draftEditorPage.expectReadTimeValue(1);
    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).readTime, { timeout: 8_000 })
      .toBe(1);

    await session.close();
  });

  test('TagsSelect adds existing tag, TagsWrapper delete removes it, and expand icon reveals long tag list', async ({ browser, app, adminApi }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-tags`;
    const tagNames = [0, 1, 2].map((index) => `${label}-tag-${index}`);
    for (const tagName of tagNames) {
      await expectStatus(await adminApi.post(`${API_PREFIX}/tags`, { data: { name: tagName } }), 201);
    }
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
      tags: tagNames.slice(0, 2).map((name) => ({ name })),
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.selectExistingTag(tagNames[2]);
    await session.page.locator('.tags-wrapper__expand-icon').click();
    await session.draftEditorPage.expectTagVisible(tagNames[2]);
    await session.draftEditorPage.expectTagVisible(tagNames[0]);

    await session.draftEditorPage.removeTag(tagNames[2]);
    await session.draftEditorPage.expectTagHidden(tagNames[2]);

    await session.close();
  });

  test('@critical header publish button publishes draft, opens public article route, and article appears in list', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-publish-header`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
      articlePage: new ArticlePage(page),
      articlesPage: new ArticlesPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.publish();
    await session.draftEditorPage.expectPublished(draft.id);
    await session.articlePage.expectArticleVisible(draft);

    await session.articlesPage.open();
    await session.articlesPage.expectArticleVisible(draft);

    await session.close();
  });

  test('footer publish button publishes draft and opens public article route', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-publish-footer`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.publishFromFooter();
    await session.draftEditorPage.expectPublished(draft.id);

    await session.close();
  });

  test('another writer opening draft editor redirects to no-permission', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-permission`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} private draft`,
      content: `${label} private content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'secondaryWriter', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await expect(session.page).toHaveURL(/\/no-permission$/);

    await session.close();
  });

  test('view mode toggle changes editor layout', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-view`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.toggleViewMode();
    await session.draftEditorPage.expectReadingModeChanged();

    await session.close();
  });

  test('autosave 500 response shows visible notification', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-error`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.page.route(`**/api/articles/${draft.id}`, (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'E2E forced failure' }) });
      }

      return route.continue();
    });

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateTitle(`${label} failing title`);

    await expect(session.page.getByRole('alert').filter({ hasText: /error|ошиб|failed|не удалось/i }).first()).toBeVisible({ timeout: 8_000 });

    await session.close();
  });
});
