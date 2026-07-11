import { expect, type Locator, type Page } from '@playwright/test';

export class NewTodoPage {
  readonly titleInput: Locator;
  readonly contentInput: Locator;
  readonly createButton: Locator;
  readonly prioritySelect: Locator;
  readonly stateSelect: Locator;

  constructor(private readonly page: Page) {
    this.titleInput = page.locator('[data-marker="todo-title-input"]');
    this.contentInput = page.locator('[data-marker="todo-content-input"]');
    this.createButton = page.locator('[data-marker="todo-create-button"]');
    this.prioritySelect = page.locator('[data-marker="todo-priority-select"]');
    this.stateSelect = page.locator('[data-marker="todo-state-select"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/todos/new');
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/todos\/new/);
    await expect(this.titleInput).toBeVisible();
  }

  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  async fillContent(content: string): Promise<void> {
    await this.contentInput.fill(content);
  }

  async selectPriority(priority: string): Promise<void> {
    await this.prioritySelect.click();
    await this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(priority, 'i') }).click();
  }

  async selectState(state: string): Promise<void> {
    await this.stateSelect.click();
    await this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(state, 'i') }).click();
  }

  async create(): Promise<void> {
    await this.createButton.click();
  }

  async expectTitleValue(title: string): Promise<void> {
    await expect(this.titleInput).toHaveValue(title);
  }

  async expectContentValue(content: string): Promise<void> {
    await expect(this.contentInput).toHaveValue(content);
  }

  async expectRequiredValidation(): Promise<void> {
    await expect(this.page.getByText(/required|обязатель/i).first()).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: /cancel|отмен/i }).click();
  }

  async back(): Promise<void> {
    await this.page.getByRole('button', { name: /back|назад/i }).click();
  }
}
