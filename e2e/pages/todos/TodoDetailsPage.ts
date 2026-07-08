import { expect, type Page } from '@playwright/test';

export class TodoDetailsPage {
  constructor(private readonly page: Page) {}

  async open(todoId: string): Promise<void> {
    await this.page.goto(`/todos/${todoId}`);
  }

  async expectTitleVisible(title: string): Promise<void> {
    await expect(this.page.locator('body')).toContainText(title);
  }

  async expectChecklistAreaVisible(): Promise<void> {
    await expect(this.page.locator('[data-marker="checklist-card"]')).toBeVisible();
  }
}
