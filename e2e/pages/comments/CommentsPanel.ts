import { expect, type Locator, type Page } from '@playwright/test';

export class CommentsPanel {
  readonly input: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.input = page.locator('[data-marker="comment-input"]').first();
    this.submitButton = page.locator('[data-marker="comment-submit-button"]').first();
  }

  comment(content: string): Locator {
    return this.page.locator('.comment').filter({ hasText: content });
  }

  async create(content: string): Promise<void> {
    await this.input.fill(content);
    await this.submitButton.click();
  }

  async expectCreateDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async replyTo(content: string, reply: string): Promise<void> {
    await this.comment(content).getByRole('button', { name: /reply|ответ/i }).click();
    const replyInput = this.page.locator('[data-marker="comment-input"]').last();
    await replyInput.fill(reply);
    await this.page.locator('[data-marker="comment-submit-button"]').last().click();
  }

  async openReply(content: string): Promise<void> {
    await this.comment(content).getByRole('button', { name: /reply|ответ/i }).click();
  }

  async cancelReply(): Promise<void> {
    await this.page.getByRole('button', { name: /cancel|отмена/i }).last().click();
  }

  async startEdit(content: string): Promise<void> {
    await this.comment(content).getByRole('button', { name: /edit|измен/i }).click();
  }

  async edit(content: string, nextContent: string): Promise<void> {
    await this.startEdit(content);
    await this.input.fill(nextContent);
    await this.submitButton.click();
  }

  async delete(content: string): Promise<void> {
    await this.comment(content).getByRole('button', { name: /delete|удал/i }).click();
  }

  async confirmDelete(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    if ((await dialog.count()) > 0) {
      await dialog.getByRole('button', { name: /delete|удалить|ok|да/i }).click();
    }
  }

  async like(content: string): Promise<void> {
    await this.comment(content).getByRole('button', { name: /like|unlike|нрав/i }).click();
  }

  async expectCommentVisible(content: string): Promise<void> {
    await expect(this.comment(content)).toBeVisible();
  }

  async expectCommentHidden(content: string): Promise<void> {
    await expect(this.comment(content)).toHaveCount(0);
  }

  async expectReplyFormVisible(): Promise<void> {
    await expect(this.page.locator('[data-marker="comment-input"]').last()).toBeVisible();
  }

  async expectNoReplyFormVisible(): Promise<void> {
    await expect(this.page.locator('[data-marker="comment-input"]')).toHaveCount(1);
  }

  async expectOwnMutationControlsVisible(content: string): Promise<void> {
    const comment = this.comment(content);
    await expect(comment.getByRole('button', { name: /edit|измен/i })).toBeVisible();
    await expect(comment.getByRole('button', { name: /delete|удал/i })).toBeVisible();
  }

  async expectOwnMutationControlsHidden(content: string): Promise<void> {
    const comment = this.comment(content);
    await expect(comment.getByRole('button', { name: /edit|измен/i })).toHaveCount(0);
    await expect(comment.getByRole('button', { name: /delete|удал/i })).toHaveCount(0);
  }
}
