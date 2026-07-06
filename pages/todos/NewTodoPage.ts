import { expect, type Page } from '@playwright/test';

export class NewTodoPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/todos/new');
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/todos\/new/);
    await expect(this.page.locator('body')).toContainText(/title|задач|назван/i);
  }
}
