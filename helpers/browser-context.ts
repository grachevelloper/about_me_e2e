import type { Browser, Page } from '@playwright/test';

import type { TestContext } from '../setup/test-context';

type AuthenticatedPage<T> = {
  page: Page;
  close: () => Promise<void>;
} & T;

export async function createAuthenticatedPage<T>(
  browser: Browser,
  app: TestContext,
  user: keyof TestContext['users'],
  buildPages: (page: Page) => T,
): Promise<AuthenticatedPage<T>> {
  const context = await browser.newContext({
    storageState: app.users[user].storageStatePath,
  });
  const page = await context.newPage();

  return {
    page,
    ...buildPages(page),
    close: () => context.close(),
  };
}
