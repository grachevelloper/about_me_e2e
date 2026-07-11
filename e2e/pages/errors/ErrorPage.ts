import { expect, type Page } from '@playwright/test';

export class ErrorPage {
  constructor(private readonly page: Page) {}

  async open(route: string): Promise<void> {
    await this.page.goto(route);
  }

  async expectNotFound(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/not found|не найден|404/i);
  }

  async expectNoPermission(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/permission|доступ|прав/i);
  }

  async goBack(): Promise<void> {
    await this.page.getByRole('button', { name: /go back|назад/i }).click();
  }
}
