import { test } from '../../fixtures/test';
import { createDraftArticle } from '../../helpers/api/entities/articles-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { DraftEditorPage } from '../../pages/articles/DraftEditorPage';

test.describe('article editor', () => {
  test('writer can open own draft editor', async ({ browser, app }, testInfo) => {
    test.slow();

    const label = `${app.runId}-${testInfo.project.name}`;
    const draft = await createDraftArticle(app, 'writerA', {
      title: `${label} editor draft`,
      content: `${label} editor draft content`,
    });
    const session = await createAuthenticatedPage(browser, app, 'writerA', (page) => ({
      draftEditorPage: new DraftEditorPage(page),
    }));

    await session.draftEditorPage.open(draft.id);
    await session.draftEditorPage.expectOpened(draft.id);
    await session.draftEditorPage.expectTitleVisible(draft.title);

    await session.close();
  });
});
