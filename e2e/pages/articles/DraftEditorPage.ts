import { expect, type Locator, type Page } from '@playwright/test';

export class DraftEditorPage {
  readonly titleInput: Locator;
  readonly contentEditor: Locator;
  readonly saveIndicator: Locator;
  readonly publishButton: Locator;
  readonly imageInput: Locator;
  readonly readTimeInput: Locator;
  readonly tagsSelect: Locator;

  constructor(private readonly page: Page) {
    this.titleInput = page.locator('[data-marker="draft-title-input"]');
    this.contentEditor = page.locator('[data-marker="draft-content-editor"]');
    this.saveIndicator = page.locator('[data-marker="draft-save-button"]');
    this.publishButton = page.locator('[data-marker="draft-publish-button"]');
    this.imageInput = page.locator('[data-marker="draft-image-input"]');
    this.readTimeInput = page.getByRole('spinbutton').first();
    this.tagsSelect = page.locator('[data-marker="draft-tags-select"]');
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

  async updateTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  async updateContent(content: string): Promise<void> {
    await this.contentEditor.click();
    await this.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await this.page.keyboard.type(content);
  }

  async updateImage(url: string): Promise<void> {
    await this.imageInput.fill(url);
  }

  async updateReadTime(minutes: number): Promise<void> {
    await this.readTimeInput.fill(String(minutes));
    await this.readTimeInput.blur();
  }

  async selectExistingTag(tagName: string): Promise<void> {
    await this.tagsSelect.click();
    const combobox = this.tagsSelect.getByRole('combobox');
    await combobox.fill(tagName);
    await this.page.keyboard.press('Enter');
    await expect(this.tagsSelect).toContainText(tagName);
  }

  async removeTag(tagName: string): Promise<void> {
    await this.page.locator('.article-tag').filter({ hasText: tagName }).locator('.ant-tag-close-icon').click();
  }

  async publish(): Promise<void> {
    await this.publishButton.first().click();
  }

  async publishFromFooter(): Promise<void> {
    await this.page.locator('.draft-article-page__footer').getByRole('button', { name: /publish|опублик/i }).click();
  }

  async toggleViewMode(): Promise<void> {
    await this.page.locator('.view-mode-toggle').click();
  }

  async expectPublished(articleId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/articles/${articleId}`));
  }

  async expectEditorFieldsVisible(article: Pick<import('../../data/articles').Article, 'title' | 'content' | 'image' | 'readTime'>): Promise<void> {
    await expect(this.titleInput).toHaveValue(article.title);
    await expect(this.contentEditor).toContainText(article.content);
    await expect(this.imageInput).toHaveValue(article.image);
    await expect(this.readTimeInput).toHaveValue(String(article.readTime));
    await expect(this.tagsSelect).toBeVisible();
  }

  async expectImagePreviewVisible(title: string): Promise<void> {
    await expect(this.page.getByRole('img', { name: title })).toBeVisible();
  }

  async expectTagVisible(tagName: string): Promise<void> {
    await expect(this.page.locator('.article-tag').filter({ hasText: tagName })).toBeVisible();
  }

  async expectTagHidden(tagName: string): Promise<void> {
    await expect(this.page.locator('.article-tag').filter({ hasText: tagName })).toHaveCount(0);
  }

  async expectReadTimeValue(minutes: number): Promise<void> {
    await expect(this.readTimeInput).toHaveValue(String(minutes));
  }

  async expectReadingModeChanged(): Promise<void> {
    await expect(this.page.locator('.draft-article-page')).toHaveClass(/reading/);
  }
}
