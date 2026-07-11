import { expect, type Page } from '@playwright/test';

import type { Article } from '../../data/articles';

export class ArticlesPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/articles');
  }

  articleCard(article: Pick<Article, 'title'>) {
    return this.page.locator('[data-marker="article-card"]').filter({ hasText: article.title });
  }

  async clickArticle(article: Pick<Article, 'title'>): Promise<void> {
    await this.articleCard(article).click();
  }

  async createArticle(): Promise<void> {
    await this.page.getByRole('button', { name: /write article|create article|написать|создать/i }).click();
  }

  async search(query: string): Promise<void> {
    await this.page.getByPlaceholder(/search|поиск|найти/i).fill(query);
  }

  async expectEmptyStateVisible(): Promise<void> {
    await expect(this.page.locator('.articles-list__empty, .ant-empty')).toBeVisible();
  }

  async expectSkeletonsVisible(): Promise<void> {
    await expect(this.page.locator('.article-card').first()).toBeVisible();
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/articles/);
    await expect(this.page.getByRole('heading', { name: /articles|статьи/i })).toBeVisible();
  }

  async expectArticleVisible(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.articleCard(article)).toBeVisible();
  }

  async expectArticleHidden(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.articleCard(article)).toHaveCount(0);
  }

  async expectCreateArticleVisible(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /write article|create article|написать|создать/i })).toBeVisible();
  }

  async expectCreateArticleHidden(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /write article|create article|написать|создать/i })).toHaveCount(0);
  }
}
