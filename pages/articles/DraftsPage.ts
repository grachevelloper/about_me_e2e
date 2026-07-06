import { expect, type Page } from '@playwright/test';

export class DraftsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/articles/drafts');
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/articles\/drafts/);
    await expect(this.page.locator('body')).toBeVisible();
  }
}
