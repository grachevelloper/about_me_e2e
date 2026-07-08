import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly authError: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('[data-marker="auth-email-input"]');
    this.passwordInput = page.locator('[data-marker="auth-password-input"]');
    this.submitButton = page.locator('[data-marker="auth-submit"]');
    this.authError = page.getByText(/invalid credentials|incorrect password|неверный пароль/i);
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/signin');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.authError).toBeVisible();
  }
}
