import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly authError: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByPlaceholder(/email|почт/i);
    this.passwordInput = page.getByPlaceholder(/password|пароль/i);
    this.submitButton = page.getByRole('button', { name: /sign in|войти/i });
    this.authError = page.getByText(/invalid credentials|incorrect password|невер|парол/i);
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
