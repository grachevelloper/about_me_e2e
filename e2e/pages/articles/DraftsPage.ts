import { expect, type Page } from '@playwright/test';

import type { Article } from '../../data/articles';

export class DraftsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/articles/drafts');
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/articles\/drafts/);
    await expect(this.page.locator('body')).toContainText(/draft|чернов/i);
  }

  draftCard(article: Pick<Article, 'title'>) {
    return this.page.locator('[data-marker="article-card"]').filter({ hasText: article.title });
  }

  async createArticle(): Promise<void> {
    await this.page.getByRole('button', { name: /write article|create article|написать|создать/i }).click();
  }

  async clickDraft(article: Pick<Article, 'title'>): Promise<void> {
    await this.draftCard(article).click();
  }

  async search(query: string): Promise<void> {
    await this.page.getByPlaceholder(/search|поиск|найти/i).fill(query);
  }

  async expectDraftVisible(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.draftCard(article)).toBeVisible();
  }

  async expectDraftHidden(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.draftCard(article)).toHaveCount(0);
  }
}
