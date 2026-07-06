import { expect, type Locator, type Page } from '@playwright/test';

export class RegistrationPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly nextOrSubmitButton: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByPlaceholder(/name|имя/i);
    this.emailInput = page.getByPlaceholder(/email|почт/i);
    this.passwordInput = page.getByPlaceholder(/^password$|пароль$/i);
    this.confirmPasswordInput = page.getByPlaceholder(/confirm|повтор/i);
    this.nextOrSubmitButton = page.getByRole('button', { name: /далее|зарегистр|завершить/i });
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/signup');
  }

  async register(data: { username: string; email: string; password: string }): Promise<void> {
    await this.nextOrSubmitButton.click();
    await this.nameInput.fill(data.username);
    await this.nextOrSubmitButton.click();
    await this.emailInput.fill(data.email);
    await this.nextOrSubmitButton.click();
    await this.passwordInput.fill(data.password);
    await this.nextOrSubmitButton.click();
    await this.confirmPasswordInput.fill(data.password);
    await this.nextOrSubmitButton.click();
  }

  async expectRegistrationFinished(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /ура/i })).toBeVisible();
  }
}
