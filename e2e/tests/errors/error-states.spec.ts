import { test } from '../../fixtures/test';

test.describe('error states', () => {
  test('missing article shows not-found state or redirects to not-found route', async ({ errorPage }) => {
    test.fixme(true, 'BUG: missing article renders a blank article page instead of a not-found state');

    await errorPage.open('/articles/00000000-0000-4000-8000-000000000000');

    await errorPage.expectNotFound();
  });

  test('no-permission route renders permission error', async ({ errorPage }) => {
    await errorPage.open('/no-permission');

    await errorPage.expectNoPermission();
  });
});
