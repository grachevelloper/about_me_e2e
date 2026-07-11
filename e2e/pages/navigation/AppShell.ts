import { expect, type Locator, type Page } from '@playwright/test';

export class AppShell {
  readonly homeLink: Locator;
  readonly resumeLink: Locator;
  readonly articlesLink: Locator;
  readonly draftsLink: Locator;
  readonly userName: Locator;
  readonly logoutButton: Locator;
  readonly openNavigationButton: Locator;
  readonly signInAction: Locator;
  readonly signUpAction: Locator;
  readonly suggestAction: Locator;
  readonly createArticleAction: Locator;
  readonly createTodoAction: Locator;
  readonly logoutDialog: Locator;
  readonly cookieNotification: Locator;
  readonly acceptCookiesButton: Locator;

  constructor(private readonly page: Page) {
    this.homeLink = page.locator('[data-marker="nav-home-link"]');
    this.resumeLink = page.locator('[data-marker="nav-resume-link"]');
    this.articlesLink = page.locator('[data-marker="nav-articles-link"]');
    this.draftsLink = page.locator('[data-marker="nav-drafts-link"]');
    this.userName = page.locator('[data-marker="nav-user-name"]');
    this.logoutButton = page.locator('[data-marker="nav-logout-button"]');
    this.openNavigationButton = page.getByRole('button', { name: /open navigation|открыть навигацию/i });
    this.signInAction = page.getByRole('menuitem', { name: /sign in|войти/i });
    this.signUpAction = page.getByRole('menuitem', { name: /sign up|зарегистр/i });
    this.suggestAction = page.getByRole('menuitem', { name: /suggest a daily task|предлож/i });
    this.createArticleAction = page.getByRole('menuitem', { name: /create article|создать статью/i });
    this.createTodoAction = page.getByRole('menuitem', { name: /create task|создать задач/i });
    this.logoutDialog = page.getByRole('dialog').filter({ hasText: /sign out|выйти/i });
    this.cookieNotification = page.getByRole('alert').filter({ hasText: /cookies|куки|печень/i });
    this.acceptCookiesButton = page.getByRole('button', { name: /accept|принять/i });
  }

  async open(route = '/'): Promise<void> {
    await this.page.goto(route);
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async openHomeViaNav(): Promise<void> {
    await this.homeLink.click();
  }

  async openResumeViaNav(): Promise<void> {
    await this.resumeLink.click();
  }

  async openArticlesViaNav(): Promise<void> {
    await this.articlesLink.click();
  }

  async openDraftsViaNav(): Promise<void> {
    await this.draftsLink.click();
  }

  async openSignInAction(): Promise<void> {
    await this.signInAction.click();
  }

  async openSignUpAction(): Promise<void> {
    await this.signUpAction.click();
  }

  async openSuggestTodoAction(): Promise<void> {
    await this.suggestAction.click();
  }

  async openLogoutDialog(): Promise<void> {
    await this.logoutButton.click();
  }

  async cancelLogout(): Promise<void> {
    await this.logoutDialog.getByRole('button', { name: /i will stay|остан/i }).click();
  }

  async confirmLogout(): Promise<void> {
    await this.logoutDialog.getByRole('button', { name: /sign out|выйти/i }).click();
  }

  async openCreateTodoAction(): Promise<void> {
    await this.createTodoAction.click();
  }

  async openCreateArticleAction(): Promise<void> {
    await this.createArticleAction.click();
  }

  async toggleSidebar(): Promise<void> {
    await this.openNavigationButton.click();
  }

  async acceptCookies(): Promise<void> {
    await this.acceptCookiesButton.click();
  }

  async openFooterTelegram(): Promise<void> {
    await this.page.getByRole('link', { name: /@gracheveloper/i }).click();
  }

  footerEmailLink(): Locator {
    return this.page.getByRole('link', { name: /@/i }).filter({ hasText: /@/ });
  }

  async expectRoute(route: RegExp | string): Promise<void> {
    await expect(this.page).toHaveURL(route);
  }

  async expectPublicPageVisible(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/auth\/signin/);
  }

  async expectUserVisible(username: string): Promise<void> {
    await expect(this.userName).toContainText(username, { timeout: 10_000 });
  }

  async expectGuestActionsVisible(): Promise<void> {
    await expect(this.signInAction).toBeVisible();
    await expect(this.signUpAction).toBeVisible();
  }

  async expectSuggestModalVisible(): Promise<void> {
    await expect(this.page.getByRole('dialog').filter({ hasText: /suggest an idea|предлож/i })).toBeVisible();
  }

  async expectLogoutDialogVisible(): Promise<void> {
    await expect(this.logoutDialog).toBeVisible();
  }

  async expectCookieNotificationVisible(): Promise<void> {
    await expect(this.cookieNotification).toBeVisible({ timeout: 10_000 });
  }

  async expectCookieNotificationHidden(): Promise<void> {
    await expect(this.cookieNotification).toHaveCount(0);
  }

  async expectNavigationVisible(): Promise<void> {
    await expect(this.homeLink).toBeVisible();
    await expect(this.resumeLink).toBeVisible();
    await expect(this.articlesLink).toBeVisible();
  }
}
