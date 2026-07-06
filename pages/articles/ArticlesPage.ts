import { expect, type Page } from '@playwright/test';

import type { Article } from '../../data/articles';

export class ArticlesPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/articles');
  }

  async expectArticleVisible(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.page.getByText(article.title)).toBeVisible();
  }

  async expectArticleHidden(article: Pick<Article, 'title'>): Promise<void> {
    await expect(this.page.getByText(article.title)).toHaveCount(0);
  }
}
