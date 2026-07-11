import { expect, type Locator, type Page } from '@playwright/test';

export class ChecklistPanel {
  readonly card: Locator;
  readonly addInput: Locator;
  readonly addButton: Locator;
  readonly items: Locator;

  constructor(private readonly page: Page) {
    this.card = page.locator('[data-marker="checklist-card"]');
    this.addInput = page.locator('[data-marker="checklist-add-input"]:visible').first();
    this.addButton = page.locator('[data-marker="checklist-add-button"]:visible').first();
    this.items = page.locator('[data-marker="checklist-item"]');
  }

  async create(): Promise<void> {
    await this.card.getByRole('button', { name: /create checklist|создать чек-лист/i }).first().click();
  }

  async openAddItem(): Promise<void> {
    const addButton = this.card.getByRole('button', { name: /add first item|add item|добавить первый пункт|добавить пункт|добавить/i }).first();

    if ((await addButton.count()) === 0) {
      await this.enterEditMode();
    }

    await this.card.getByRole('button', { name: /add first item|add item|добавить первый пункт|добавить пункт|добавить/i }).first().click();
  }

  async addItem(text: string): Promise<void> {
    await this.openAddItem();
    await this.addInput.fill(text);
    await this.addButton.click();
    await this.expectItemVisible(text);
  }

  async enterEditMode(): Promise<void> {
    const editButton = this.card.getByRole('button', { name: /^(edit\s+)?(edit|редактировать)$/i });

    if ((await editButton.count()) > 0) {
      await editButton.click();
    }
  }

  async finishEditMode(): Promise<void> {
    const finishButton = this.card.getByRole('button', { name: /^(finish|завершить)$/i });

    if ((await finishButton.count()) > 0) {
      await finishButton.click();
    }
  }

  async expectEditModeFinished(): Promise<void> {
    await expect(this.card.getByRole('button', { name: /^(finish|завершить)$/i })).toHaveCount(0);
  }

  async editItem(currentText: string, nextText: string): Promise<void> {
    await this.enterEditMode();
    const itemRow = this.card.locator('.ant-steps-item-title').filter({ hasText: currentText });
    await itemRow.getByRole('button', { name: /change|изменить/i }).click();
    await this.card.locator('input:visible').first().fill(nextText);
    await this.card.getByRole('button', { name: /✓/ }).first().click();
    await this.expectItemVisible(nextText);
  }

  async startEditItem(currentText: string): Promise<void> {
    await this.enterEditMode();
    const itemRow = this.card.locator('.ant-steps-item-title').filter({ hasText: currentText });
    await itemRow.getByRole('button', { name: /change|изменить/i }).click();
  }

  async saveEditedItem(currentText: string, nextText: string): Promise<void> {
    await this.card.locator('input:visible').first().fill(nextText);
    await this.card.getByRole('button', { name: /✓/ }).first().click();
    await this.expectItemVisible(nextText);
  }

  async cancelEditedItem(currentText: string, nextText: string): Promise<void> {
    await this.card.locator('input:visible').first().fill(nextText);
    await this.card.getByRole('button', { name: /✕/ }).first().click();
    await this.expectItemVisible(currentText);
    await expect(this.items.filter({ hasText: nextText })).toHaveCount(0);
  }

  async deleteItem(text: string): Promise<void> {
    await this.enterEditMode();
    const itemRow = this.card.locator('.ant-steps-item-title').filter({ hasText: text });
    await itemRow.getByRole('button').last().click();
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByRole('dialog').getByRole('button', { name: /delete|удалить/i }).click();
  }

  async cancelDelete(): Promise<void> {
    await this.page.getByRole('dialog').getByRole('button', { name: /cancel|отмена/i }).click();
  }

  async setProgress(stepName: string): Promise<void> {
    await this.card.getByText(stepName).click();
  }

  async expectCreateChecklistActionVisible(): Promise<void> {
    await expect(this.card.getByRole('button', { name: /create checklist|создать чек-лист/i }).first()).toBeVisible();
  }

  async expectEmptyChecklistVisible(): Promise<void> {
    await expect(this.card).toContainText(/empty|пуст/i);
  }

  async expectAddButtonDisabled(): Promise<void> {
    await expect(this.addButton.first()).toBeDisabled();
  }

  async expectMutationControlsHidden(): Promise<void> {
    await expect(this.card.getByRole('button', { name: /add first item|add item|добавить первый пункт|добавить пункт|добавить/i })).toHaveCount(0);
    await expect(this.card.getByRole('button', { name: /^(edit\s+)?(edit|редактировать)$/i })).toHaveCount(0);
  }

  async expectProgressText(text: string): Promise<void> {
    await expect(this.card).toContainText(text);
  }

  async expectVisible(): Promise<void> {
    await expect(this.card).toBeVisible();
  }

  async expectItemVisible(text: string): Promise<void> {
    await expect(this.items.filter({ hasText: text })).toBeVisible();
  }
}
