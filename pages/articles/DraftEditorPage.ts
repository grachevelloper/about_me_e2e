import { expect, type Page } from '@playwright/test';

export class DraftEditorPage {
  constructor(private readonly page: Page) {}

  async open(draftId: string): Promise<void> {
    await this.page.goto(`/articles/draft/${draftId}`);
  }

  async expectOpened(draftId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/articles/draft/${draftId}`));
  }

  async expectTitleVisible(title: string): Promise<void> {
    await expect(this.page.locator('body')).toContainText(title);
  }
}
