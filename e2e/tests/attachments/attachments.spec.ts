import { test, expect } from '../../fixtures/test';
import { createDraftArticle, getArticle } from '../../helpers/api/entities/articles-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';

test.describe('attachments and markdown editor UI', () => {
  test('article editor currently has no visible attachment upload control', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-attachment-ui`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);

    await expect(session.page.locator('input[type="file"]:visible')).toHaveCount(0);
    await expect(session.page.getByRole('button', { name: /upload|attach|image upload|загруз|прикреп/i })).toHaveCount(0);

    await session.close();
  });

  test('editor link creation button does not break content editing', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-link`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));
    const linkedContent = `${label} [OpenAI](https://openai.com) content`;

    await session.draftEditorPage.open(draft.id);
    await session.page.getByRole('button', { name: /link|ссылка/i }).click();
    await session.draftEditorPage.updateContent(linkedContent);

    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).content, { timeout: 8_000 })
      .toBe(linkedContent);

    await session.close();
  });

  test('basic markdown input persists in article content', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-markdown`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} draft`,
      content: `${label} content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writer', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));
    const markdown = `${label} **bold** *italic*`;

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.updateContent(markdown);

    await expect
      .poll(async () => (await getArticle(draft.id, app.users.writer.storageStatePath)).content, { timeout: 8_000 })
      .toBe(markdown);

    await session.close();
  });
});
