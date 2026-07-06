import { expect, type Page } from '@playwright/test';

export class AppShell {
  constructor(private readonly page: Page) {}

  async open(route: string): Promise<void> {
    await this.page.goto(route);
  }

  async expectPublicPageVisible(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/auth\/signin/);
  }

  async expectUserVisible(username: string): Promise<void> {
    await expect(this.page.getByText(username)).toBeVisible({ timeout: 10_000 });
  }
}
