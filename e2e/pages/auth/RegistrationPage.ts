import { expect, type Locator, type Page } from '@playwright/test';

export class RegistrationPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly nextOrSubmitButton: Locator;
  readonly previousButton: Locator;
  readonly signInLink: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByPlaceholder(/name|имя/i);
    this.emailInput = page.locator('[data-marker="auth-email-input"]');
    this.passwordInput = page.locator('[data-marker="auth-password-input"]');
    this.confirmPasswordInput = page.getByPlaceholder(/confirm|повтор/i);
    this.nextOrSubmitButton = page.getByRole('button', { name: /continue|далее|зарегистр|завершить/i });
    this.previousButton = page.getByRole('button', { name: /back|назад/i });
    this.signInLink = page.locator('[data-marker="auth-signin-link"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/signup');
  }

  async next(): Promise<void> {
    await this.nextOrSubmitButton.click();
  }

  async previous(): Promise<void> {
    await this.previousButton.click();
  }

  async register(data: { username: string; email: string; password: string }): Promise<void> {
    await this.next();
    await this.nameInput.fill(data.username);
    await this.next();
    await this.emailInput.fill(data.email);
    await this.next();
    await this.passwordInput.fill(data.password);
    await this.next();
    await this.confirmPasswordInput.fill(data.password);
    await this.next();
  }

  async completeIntro(): Promise<void> {
    await this.next();
  }

  async fillUsername(username: string): Promise<void> {
    await this.nameInput.fill(username);
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async switchToSignin(): Promise<void> {
    await this.signInLink.click({ force: true });
  }

  async finish(): Promise<void> {
    await this.page.getByRole('button', { name: /continue|ура/i }).click();
  }

  async expectIntroStep(): Promise<void> {
    await expect(this.page.getByText(/hello|здравствуй/i)).toBeVisible();
  }

  async expectUsernameStep(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
  }

  async expectEmailStep(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
  }

  async expectPasswordStep(): Promise<void> {
    await expect(this.passwordInput).toBeVisible();
  }

  async expectConfirmPasswordStep(): Promise<void> {
    await expect(this.confirmPasswordInput).toBeVisible();
  }

  async expectNextDisabled(): Promise<void> {
    await expect(this.nextOrSubmitButton).toBeDisabled();
  }

  async expectEmailValidation(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/valid email|коррект/i);
  }

  async expectPasswordValidation(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/password|пароль/i);
  }

  async expectConfirmPasswordMismatch(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/do not match|не совпадают/i);
  }

  async expectDuplicateSignupError(): Promise<void> {
    await expect(this.page.locator('.ant-alert').filter({ hasText: /registration|регистрац|попробуйте/i })).toBeVisible();
  }

  async expectRegistrationFinished(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /continue|ура/i })).toBeVisible();
  }
}
