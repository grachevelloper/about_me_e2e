import { expect, type Locator, type Page } from '@playwright/test';

export class DraftEditorPage {
  readonly titleInput: Locator;
  readonly contentEditor: Locator;
  readonly publishButton: Locator;

  constructor(private readonly page: Page) {
    this.titleInput = page.locator('[data-marker="draft-title-input"]');
    this.contentEditor = page.locator('[data-marker="draft-content-editor"]');
    this.publishButton = page.locator('[data-marker="draft-publish-button"]');
  }

  async open(draftId: string): Promise<void> {
    await this.page.goto(`/articles/draft/${draftId}`);
  }

  async expectOpened(draftId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/articles/draft/${draftId}`));
  }

  async expectTitleVisible(title: string): Promise<void> {
    await expect(this.titleInput).toHaveValue(title);
  }
}
