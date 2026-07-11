import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly authError: Locator;
  readonly signUpLink: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('[data-marker="auth-email-input"]');
    this.passwordInput = page.locator('[data-marker="auth-password-input"]');
    this.submitButton = page.locator('[data-marker="auth-submit"]');
    this.authError = page.getByText(/invalid credentials|incorrect password|неверный пароль/i);
    this.signUpLink = page.locator('[data-marker="auth-signup-link"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/signin');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async switchToSignup(): Promise<void> {
    await this.signUpLink.click({ force: true });
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/signin/);
    await expect(this.page.getByRole('heading', { name: /sign in|вход/i })).toBeVisible();
  }

  async expectEmailValidation(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/valid email|коррект/i);
  }

  async expectLoginError(): Promise<void> {
    await expect(this.authError).toBeVisible();
  }
}
