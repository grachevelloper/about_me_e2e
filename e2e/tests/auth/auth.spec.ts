import { test, expect } from '../../fixtures/test';
import { API_PREFIX, newApiContext } from '../../helpers/api/client';
import { signup } from '../../helpers/api/entities/users-api';
import { uniqueUser } from '../../data/users';

test.describe('auth', () => {
  test('signup wizard starts on intro step', async ({ registrationPage }) => {
    await registrationPage.open();

    await registrationPage.expectIntroStep();
  });

  test('signup Next moves to username step', async ({ registrationPage }) => {
    await registrationPage.open();

    await registrationPage.next();

    await registrationPage.expectUsernameStep();
  });

  test('username Next is disabled until username is valid', async ({ registrationPage }) => {
    await registrationPage.open();
    await registrationPage.next();

    await registrationPage.expectNextDisabled();
    await registrationPage.fillUsername('valid-user');

    await expect(registrationPage.nextOrSubmitButton).toBeEnabled();
  });

  test('signup Previous returns to previous step', async ({ registrationPage }) => {
    await registrationPage.open();
    await registrationPage.next();

    await registrationPage.previous();

    await registrationPage.expectIntroStep();
  });

  test('email validation is shown for malformed email', async ({ registrationPage }) => {
    await registrationPage.open();
    await registrationPage.next();
    await registrationPage.fillUsername('valid-user');
    await registrationPage.next();
    await registrationPage.fillEmail('not-an-email');
    await registrationPage.emailInput.blur();

    await registrationPage.expectEmailValidation();
  });

  test('password validation is shown for invalid password', async ({ registrationPage }) => {
    await registrationPage.open();
    await registrationPage.next();
    await registrationPage.fillUsername('valid-user');
    await registrationPage.next();
    await registrationPage.fillEmail('valid-user@example.com');
    await registrationPage.next();
    await registrationPage.fillPassword('');
    await registrationPage.passwordInput.blur();

    await registrationPage.expectPasswordValidation();
  });

  test('confirm password mismatch is shown', async ({ registrationPage }) => {
    await registrationPage.open();
    await registrationPage.next();
    await registrationPage.fillUsername('valid-user');
    await registrationPage.next();
    await registrationPage.fillEmail('valid-user@example.com');
    await registrationPage.next();
    await registrationPage.fillPassword('Password123');
    await registrationPage.next();
    await registrationPage.fillConfirmPassword('Password456');
    await registrationPage.confirmPasswordInput.blur();

    await registrationPage.expectConfirmPasswordMismatch();
  });

  test('successful signup reaches final congratulations step', async ({ registrationPage, app }, testInfo) => {
    const user = uniqueUser(app.runId, `${testInfo.project.name}-signup-final`);

    await registrationPage.open();
    await registrationPage.register(user);

    await registrationPage.expectRegistrationFinished();
  });

  test('final signup action returns to home', async ({ registrationPage, appShell, app }, testInfo) => {
    const user = uniqueUser(app.runId, `${testInfo.project.name}-signup-home`);

    await registrationPage.open();
    await registrationPage.register(user);
    await registrationPage.finish();

    await appShell.expectRoute(/\/$/);
  });

  test('duplicate signup email shows user-visible error and stays in wizard', async ({ registrationPage, app }, testInfo) => {
    const user = uniqueUser(app.runId, `${testInfo.project.name}-duplicate`);
    await signup({
      ...user,
      key: 'primaryUser',
      role: 'User',
      storageStatePath: '',
    });

    await registrationPage.open();
    await registrationPage.register(user);

    await registrationPage.expectDuplicateSignupError();
    await registrationPage.expectConfirmPasswordStep();
  });

  test('signin validates malformed email', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.emailInput.blur();

    await loginPage.expectEmailValidation();
  });

  test('signin with wrong password shows a user-visible error', async ({ loginPage, app }) => {
    await loginPage.open();
    await loginPage.login(app.users.primaryUser.email, 'WrongPassword123');

    await loginPage.expectLoginError();
  });

  test('@critical signin with valid credentials redirects home', async ({ loginPage, appShell, app }) => {
    await loginPage.open();
    await loginPage.login(app.users.primaryUser.email, app.users.primaryUser.password);

    await appShell.expectUserVisible(app.users.primaryUser.username);
  });

  test('auth floating navigate button can switch from signin to signup', async ({ loginPage, registrationPage }) => {
    await loginPage.open();
    await loginPage.switchToSignup();

    await registrationPage.expectIntroStep();
  });

  test('auth floating navigate button can switch from signup to signin', async ({ registrationPage, loginPage }) => {
    await registrationPage.open();
    await registrationPage.switchToSignin();

    await loginPage.expectOpened();
  });

  test('authenticated refresh restores session after page reload', async ({ loginPage, appShell, app }) => {

    await loginPage.open();
    await loginPage.login(app.users.primaryUser.email, app.users.primaryUser.password);
    await appShell.reload();

    await appShell.expectUserVisible(app.users.primaryUser.username);
  });

  test('@critical anonymous user cannot perform protected mutations', async () => {
    const api = await newApiContext();

    try {
      const response = await api.post(`${API_PREFIX}/todos`, {
        data: {
          title: 'anonymous forbidden todo',
          content: 'anonymous forbidden todo content',
        },
      });

      expect(response.status()).toBe(401);
    } finally {
      await api.dispose();
    }
  });
});
