import { expect, type Locator, type Page } from '@playwright/test';

export class NewTodoPage {
  readonly titleInput: Locator;
  readonly contentInput: Locator;
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.titleInput = page.locator('[data-marker="todo-title-input"]');
    this.contentInput = page.locator('[data-marker="todo-content-input"]');
    this.createButton = page.locator('[data-marker="todo-create-button"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/todos/new');
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/todos\/new/);
    await expect(this.titleInput).toBeVisible();
  }
}
