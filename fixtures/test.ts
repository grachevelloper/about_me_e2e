import { test as base } from '@playwright/test';

import { ArticlesPage } from '../pages/articles/ArticlesPage';
import { DraftEditorPage } from '../pages/articles/DraftEditorPage';
import { DraftsPage } from '../pages/articles/DraftsPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegistrationPage } from '../pages/auth/RegistrationPage';
import { ErrorPage } from '../pages/errors/ErrorPage';
import { AppShell } from '../pages/navigation/AppShell';
import { NewTodoPage } from '../pages/todos/NewTodoPage';
import { TodoDetailsPage } from '../pages/todos/TodoDetailsPage';
import { readTestContext, type TestContext } from '../setup/test-context';

type AppFixtures = {
  app: TestContext;
  appShell: AppShell;
  articlesPage: ArticlesPage;
  draftEditorPage: DraftEditorPage;
  draftsPage: DraftsPage;
  errorPage: ErrorPage;
  loginPage: LoginPage;
  newTodoPage: NewTodoPage;
  registrationPage: RegistrationPage;
  todoDetailsPage: TodoDetailsPage;
};

export const test = base.extend<AppFixtures>({
  app: async ({}, use) => {
    await use(await readTestContext());
  },
  appShell: async ({ page }, use) => {
    await use(new AppShell(page));
  },
  articlesPage: async ({ page }, use) => {
    await use(new ArticlesPage(page));
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
