import { test as base, type APIRequestContext, type Page } from '@playwright/test';

import { ArticlesPage } from '../pages/articles/ArticlesPage';
import { ArticlePage } from '../pages/articles/ArticlePage';
import { DraftEditorPage } from '../pages/articles/DraftEditorPage';
import { DraftsPage } from '../pages/articles/DraftsPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegistrationPage } from '../pages/auth/RegistrationPage';
import { CommentsPanel } from '../pages/comments/CommentsPanel';
import { ErrorPage } from '../pages/errors/ErrorPage';
import { AppShell } from '../pages/navigation/AppShell';
import { ChecklistPanel } from '../pages/todos/ChecklistPanel';
import { NewTodoPage } from '../pages/todos/NewTodoPage';
import { TodoDetailsPage } from '../pages/todos/TodoDetailsPage';
import { newApiContext } from '../helpers/api/client';
import { readTestContext, type TestContext } from '../setup/test-context';

type AppFixtures = {
  app: TestContext;
  guestApi: APIRequestContext;
  primaryUserApi: APIRequestContext;
  secondaryUserApi: APIRequestContext;
  writerApi: APIRequestContext;
  secondaryWriterApi: APIRequestContext;
  adminApi: APIRequestContext;
  appShell: AppShell;
  articlePage: ArticlePage;
  articlesPage: ArticlesPage;
  checklistPanel: ChecklistPanel;
  commentsPanel: CommentsPanel;
  draftEditorPage: DraftEditorPage;
  draftsPage: DraftsPage;
  errorPage: ErrorPage;
  loginPage: LoginPage;
  newTodoPage: NewTodoPage;
  registrationPage: RegistrationPage;
  todoDetailsPage: TodoDetailsPage;
};

async function useApiContext(use: (api: APIRequestContext) => Promise<void>, storageState?: string): Promise<void> {
  const api = await newApiContext({ storageState });

  try {
    await use(api);
  } finally {
    await api.dispose();
  }
}

async function useGuardedPage(page: Page, use: (page: Page) => Promise<void>): Promise<void> {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    const text = message.text();
    const isExpectedNetworkLog = /^Failed to load resource: the server responded with a status of [45]\d\d/.test(text);
    const isKnownAntdDeprecation = /^Warning: \[antd: .*] `.*` is deprecated\./.test(text);
    const isKnownCallbackDeprecation = /^Warning: `callback` is deprecated\./.test(text);

    if (message.type() === 'error' && !isExpectedNetworkLog && !isKnownAntdDeprecation && !isKnownCallbackDeprecation) {
      consoleErrors.push(text);
    }
  });

  await use(page);

  if (pageErrors.length > 0) {
    throw new Error(`Unexpected page errors:\n${pageErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Unexpected console errors:\n${consoleErrors.join('\n')}`);
  }
}

export const test = base.extend<AppFixtures>({
  page: async ({ page }, use) => {
    await useGuardedPage(page, use);
  },
  app: async ({}, use) => {
    await use(await readTestContext());
  },
  guestApi: async ({}, use) => {
    await useApiContext(use);
  },
  primaryUserApi: async ({ app }, use) => {
    await useApiContext(use, app.users.primaryUser.storageStatePath);
  },
  secondaryUserApi: async ({ app }, use) => {
    await useApiContext(use, app.users.secondaryUser.storageStatePath);
  },
  writerApi: async ({ app }, use) => {
    await useApiContext(use, app.users.writer.storageStatePath);
  },
  secondaryWriterApi: async ({ app }, use) => {
    await useApiContext(use, app.users.secondaryWriter.storageStatePath);
  },
  adminApi: async ({ app }, use) => {
    await useApiContext(use, app.users.admin.storageStatePath);
  },
  appShell: async ({ page }, use) => {
    await use(new AppShell(page));
  },
  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },
  articlesPage: async ({ page }, use) => {
    await use(new ArticlesPage(page));
  },
  checklistPanel: async ({ page }, use) => {
    await use(new ChecklistPanel(page));
  },
  commentsPanel: async ({ page }, use) => {
    await use(new CommentsPanel(page));
  },
  draftEditorPage: async ({ page }, use) => {
    await use(new DraftEditorPage(page));
  },
  draftsPage: async ({ page }, use) => {
    await use(new DraftsPage(page));
  },
  errorPage: async ({ page }, use) => {
    await use(new ErrorPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  newTodoPage: async ({ page }, use) => {
    await use(new NewTodoPage(page));
  },
  registrationPage: async ({ page }, use) => {
    await use(new RegistrationPage(page));
  },
  todoDetailsPage: async ({ page }, use) => {
    await use(new TodoDetailsPage(page));
  },
});

export { expect } from '@playwright/test';
