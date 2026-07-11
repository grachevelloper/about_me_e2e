import { expect, type Locator, type Page } from '@playwright/test';

import type { Article } from '../../data/articles';
import { CommentsPanel } from '../comments/CommentsPanel';

export class ArticlePage {
  readonly comments: CommentsPanel;
  readonly likeButton: Locator;

  constructor(private readonly page: Page) {
    this.comments = new CommentsPanel(page);
    this.likeButton = page.getByRole('button', { name: /like|unlike|нрав|лайк/i }).first();
  }

  async open(articleId: string): Promise<void> {
    await this.page.goto(`/articles/${articleId}`);
  }

  async expectOpened(articleId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/articles/${articleId}`));
  }

  async expectArticleVisible(article: Pick<Article, 'title' | 'content'>): Promise<void> {
    await expect(this.page.getByRole('heading', { name: article.title })).toBeVisible();
    await expect(this.page.locator('body')).toContainText(article.content);
  }

  async expectImageVisible(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.page.getByRole('img', { name: article.title })).toBeVisible();
  }

  async expectTagVisible(tagName: string): Promise<void> {
    await expect(this.page.locator('.article-tag').filter({ hasText: tagName })).toBeVisible();
  }

  async expectReadTimeVisible(minutes: number): Promise<void> {
    await expect(this.page.locator('body')).toContainText(new RegExp(String(minutes)));
  }

  async expectDatesVisible(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/created|updated|создан|измен|обновл/i);
  }

  async expectCommentFormHidden(): Promise<void> {
    await expect(this.page.locator('[data-marker="comment-input"]')).toHaveCount(0);
  }

  async expectCommentFormVisible(): Promise<void> {
    await expect(this.page.locator('[data-marker="comment-input"]').first()).toBeVisible();
  }

  async expectLikeState(count: number, pressed: boolean): Promise<void> {
    await expect(this.likeButton).toHaveAttribute('aria-pressed', String(pressed));
    await expect(this.likeButton).toContainText(String(count));
  }

  async like(): Promise<void> {
    await this.likeButton.click();
  }
}
