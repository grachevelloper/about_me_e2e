# Playwright: практический гайд для фуллстек-разработчика

Этот гайд не заменяет документацию. Он дает рабочую модель Playwright: что это, как писать нормальные e2e-тесты, какие практики использовать в этом репозитории и что уверенно отвечать на собеседовании.

## 1. Что такое Playwright

Playwright - это фреймворк для браузерных e2e-тестов. Он запускает настоящий браузер, открывает страницу, кликает, вводит текст, проверяет UI и сетевые сценарии почти так же, как пользователь.

Обычно его используют для:

- e2e-тестов критичных пользовательских сценариев;
- smoke-тестов после деплоя;
- регрессионных проверок UI;
- проверки интеграции фронта с бэком;
- тестов авторизации, форм, платежных/заказных флоу, админок.

Главная идея: Playwright проверяет не отдельную функцию, а поведение продукта глазами пользователя.

## 2. Ментальная модель

В Playwright есть несколько базовых сущностей:

- `test` - один тестовый сценарий.
- `expect` - проверки результата.
- `page` - вкладка браузера.
- `locator` - способ найти элемент на странице.
- `browser context` - изолированная браузерная сессия с куками, localStorage и permissions.
- `project` - набор настроек запуска, например Chromium, Firefox, WebKit.

Минимальный тест:

```ts
import { expect, test } from '@playwright/test';

test('user can open home page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/About Me/);
});
```

В этом репозитории `baseURL` задан в [playwright.config.ts](./playwright.config.ts), поэтому `page.goto('/')` откроет `http://localhost:3000/` или значение из `BASE_URL`.

## 3. Как запускать

Основные команды:

```bash
npm test
npm run test:ui
npm run test:headed
npm run report
```

Для другого окружения:

```bash
BASE_URL=https://example.com npm test
```

Полезные команды напрямую через Playwright:

```bash
npx playwright test tests/example.spec.ts
npx playwright test --project=chromium
npx playwright test --grep "login"
npx playwright test --debug
npx playwright codegen http://localhost:3000
```

## 4. Как писать хороший e2e-тест

Хороший e2e-тест проверяет пользовательский сценарий, а не детали реализации.

Плохо:

```ts
test('button has class', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.btn-primary')).toHaveClass(/active/);
});
```

Лучше:

```ts
test('user can submit contact form', async ({ page }) => {
  await page.goto('/contacts');

  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByLabel('Message').fill('Hello from e2e');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Message sent')).toBeVisible();
});
```

Почему лучше:

- тест читабелен как пользовательский сценарий;
- локаторы завязаны на доступность и текст, а не на CSS;
- проверяется результат, а не внутреннее состояние кнопки.

## 5. Локаторы: главный best practice

Playwright рекомендует искать элементы так, как их воспринимает пользователь.

Приоритет локаторов:

1. `getByRole` - лучший выбор для кнопок, ссылок, полей, заголовков.
2. `getByLabel` - для инпутов с label.
3. `getByPlaceholder` - если label нет, но есть placeholder.
4. `getByText` - для видимого текста.
5. `getByTestId` - для стабильных технических якорей.
6. `locator('css')` - только когда другого нормального варианта нет.

Примеры:

```ts
await page.getByRole('button', { name: 'Save' }).click();
await page.getByRole('link', { name: 'Profile' }).click();
await page.getByLabel('Password').fill('qwerty123');
await page.getByTestId('user-menu').click();
```

CSS-селекторы лучше не использовать как основной способ:

```ts
// Хрупко: верстку поменяли - тест упал.
await page.locator('.header .menu .item:nth-child(2)').click();
```

Если элемент нельзя нормально найти через role/label/text, это часто сигнал, что UI плохо размечен с точки зрения доступности. Для фуллстека это полезная обратная связь: тесты подталкивают писать более доступный интерфейс.

## 6. Ожидания: не ставь sleep

Playwright автоматически ждет элементы перед действиями. Обычно не нужен ручной `waitForTimeout`.

Плохо:

```ts
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(3000);
await expect(page.getByText('Saved')).toBeVisible();
```

Лучше:

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByText('Saved')).toBeVisible();
```

Еще примеры хороших ожиданий:

```ts
await expect(page).toHaveURL(/\/dashboard/);
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
await expect(page.getByText('Loading')).toBeHidden();
```

`waitForTimeout` допустим разве что для дебага. В тестовом коде почти всегда есть более точное ожидание.

## 7. Структура теста

Удобный формат: arrange, act, assert.

```ts
test('user can update profile name', async ({ page }) => {
  // arrange
  await page.goto('/profile');

  // act
  await page.getByLabel('Name').fill('Ivan');
  await page.getByRole('button', { name: 'Save' }).click();

  // assert
  await expect(page.getByText('Profile updated')).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('Ivan');
});
```

Комментарии `arrange/act/assert` не обязательны. Но сама структура полезна: сначала подготовка, потом действие, потом проверка.

## 8. Что тестировать e2e, а что не надо

E2E-тесты дорогие: они медленнее unit/integration, требуют окружения и могут падать из-за сетевых/инфраструктурных проблем. Поэтому ими не надо покрывать все подряд.

Хорошие кандидаты для e2e:

- логин/логаут;
- регистрация;
- основной бизнес-флоу;
- создание/редактирование/удаление важной сущности;
- платеж/заказ/заявка;
- права доступа;
- критичные ошибки и empty states.

Плохие кандидаты:

- каждая ветка маленькой функции;
- валидация всех возможных комбинаций формы;
- детальные проверки CSS;
- тестирование логики, которую проще проверить unit-тестом.

Практическое правило: e2e должен отвечать на вопрос "работает ли ключевой путь пользователя?", а не "покрыли ли мы каждую строчку кода?".

## 9. Page Object: использовать аккуратно

Page Object - это класс или объект, который инкапсулирует действия на странице.

Пример:

```ts
import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async expectError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
```

Использование:

```ts
test('user sees error with wrong password', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.login('ivan@example.com', 'wrong-password');
  await loginPage.expectError('Invalid email or password');
});
```

Best practice: не превращать Page Object в абстрактный фреймворк. Он должен скрывать повторяющиеся пользовательские действия, а не каждую кнопку на странице.

Нормально:

```ts
await loginPage.login(email, password);
```

Сомнительно:

```ts
await loginPage.emailInput().fill(email);
await loginPage.passwordInput().fill(password);
await loginPage.submitButton().click();
```

Если тест снова начинает читать DOM руками через Page Object, пользы мало.

## 10. Фикстуры

Фикстуры - это зависимости, которые Playwright передает в тест. `page` - уже встроенная фикстура.

Можно добавить свои фикстуры, например API-клиент:

```ts
import { test as base, expect, request } from '@playwright/test';

type Fixtures = {
  api: {
    createUser: (email: string) => Promise<void>;
  };
};

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const context = await request.newContext({
      baseURL: process.env.API_URL ?? 'http://localhost:3000'
    });

    await use({
      createUser: async (email: string) => {
        await context.post('/api/test/users', { data: { email } });
      }
    });

    await context.dispose();
  }
});

export { expect };
```

Тест:

```ts
import { expect, test } from './fixtures';

test('created user can log in', async ({ api, page }) => {
  await api.createUser('ivan@example.com');

  await page.goto('/login');
  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
```

Идея: через фикстуры удобно готовить данные, авторизацию, API-клиенты и общие зависимости.

## 11. Авторизация

Не надо логиниться через UI в каждом тесте. Это долго и хрупко.

Обычно делают один setup-тест, который логинится и сохраняет `storageState`.

Пример `tests/auth.setup.ts`:

```ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: '.auth/user.json' });
});
```

Потом в конфиге можно подключить storage state для проекта:

```ts
{
  name: 'authenticated',
  use: {
    ...devices['Desktop Chrome'],
    storageState: '.auth/user.json'
  }
}
```

В `.gitignore` нужно добавить:

```gitignore
.auth/
```

Почему так лучше:

- тесты быстрее;
- меньше дублирования;
- UI-логин проверяется один раз, а остальные тесты стартуют уже авторизованными.

## 12. Тестовые данные

E2E-тесты должны быть независимыми. Один тест не должен полагаться на то, что другой уже создал пользователя, заказ или настройку.

Хорошие практики:

- создавать данные через API, а не через UI, если сам UI-сценарий не про создание этих данных;
- использовать уникальные email/id;
- чистить данные после теста или создавать их в изолированном тестовом окружении;
- не завязываться на порядок запуска тестов.

Пример уникального email:

```ts
const email = `user-${Date.now()}-${test.info().parallelIndex}@example.com`;
```

Но лучше иметь серверный test helper API:

```ts
await request.post('/api/test/users', {
  data: {
    email,
    password: 'password'
  }
});
```

## 13. Работа с сетью

Playwright умеет перехватывать запросы. Это полезно, когда нужно стабилизировать внешний API или проверить UI на конкретном ответе.

Пример мока:

```ts
test('shows empty state', async ({ page }) => {
  await page.route('**/api/items', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.goto('/items');

  await expect(page.getByText('No items yet')).toBeVisible();
});
```

Пример ожидания запроса:

```ts
const responsePromise = page.waitForResponse('**/api/profile');

await page.goto('/profile');

const response = await responsePromise;
expect(response.ok()).toBeTruthy();
```

Важно: если замокать все API, это уже не полноценный e2e, а скорее browser integration test. Это нормально, но нужно понимать trade-off.

## 14. Отладка

Самые полезные инструменты:

```bash
npx playwright test --debug
npx playwright test --headed
npx playwright test --ui
npm run report
```

В конфиге уже включены:

- `trace: 'on-first-retry'` - trace появится при повторном запуске упавшего теста;
- `screenshot: 'only-on-failure'` - скриншот только при падении;
- `video: 'retain-on-failure'` - видео только при падении.

Trace - один из главных плюсов Playwright. В нем видно:

- какие действия выполнялись;
- DOM-снапшоты;
- network;
- console;
- скриншоты по шагам;
- почему ожидание не сработало.

Открыть отчет:

```bash
npm run report
```

## 15. Параллельность и изоляция

В конфиге включено:

```ts
fullyParallel: true
```

Это значит, что тесты могут запускаться параллельно. Поэтому нельзя писать тесты, которые зависят от общего состояния.

Плохо:

```ts
test('create item', async ({ page }) => {
  // создает item с названием "Test item"
});

test('delete item', async ({ page }) => {
  // ожидает, что предыдущий тест уже создал "Test item"
});
```

Лучше:

```ts
test('user can delete item', async ({ page, request }) => {
  await request.post('/api/test/items', {
    data: { name: 'Item to delete' }
  });

  await page.goto('/items');
  await page.getByRole('row', { name: /Item to delete/ })
    .getByRole('button', { name: 'Delete' })
    .click();

  await expect(page.getByText('Item deleted')).toBeVisible();
});
```

Каждый тест сам готовит себе мир.

## 16. Конфиг этого репозитория

Сейчас конфиг находится в [playwright.config.ts](./playwright.config.ts).

Ключевые настройки:

```ts
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
```

Это позволяет писать:

```ts
await page.goto('/profile');
```

А не:

```ts
await page.goto('http://localhost:3000/profile');
```

Проекты:

```ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } }
]
```

Так один тест прогоняется в трех движках. Это полезно для кроссбраузерной уверенности, но на CI может быть дорого. Частый практичный вариант:

- на каждый PR гонять Chromium;
- nightly или перед релизом гонять Chromium + Firefox + WebKit.

## 17. Как организовать проект дальше

Когда тестов станет больше, держи структуру примерно такой:

```text
tests/
  auth.setup.ts
  smoke/
    home.spec.ts
    login.spec.ts
  profile/
    profile.spec.ts
  fixtures/
    test.ts
  pages/
    login-page.ts
    profile-page.ts
```

Практики:

- `*.spec.ts` - сами сценарии;
- `fixtures/` - расширенный `test`, API-клиенты, подготовка окружения;
- `pages/` - Page Object только для повторяющихся действий;
- `auth.setup.ts` - подготовка авторизации;
- не складывать все в один огромный файл.

## 18. Naming best practices

Название теста должно объяснять поведение:

```ts
test('user can update profile name', async ({ page }) => {});
test('guest is redirected from dashboard to login', async ({ page }) => {});
test('admin can deactivate user', async ({ page }) => {});
```

Не очень:

```ts
test('profile test', async ({ page }) => {});
test('button works', async ({ page }) => {});
test('case 1', async ({ page }) => {});
```

Хорошее имя экономит время в CI-отчете.

## 19. Частые ошибки

1. Использовать `waitForTimeout`.
2. Искать элементы через CSS-классы из верстки.
3. Проверять implementation details вместо поведения.
4. Делать тесты зависимыми от порядка запуска.
5. Логиниться через UI в каждом тесте.
6. Писать слишком большие сценарии, которые проверяют сразу весь продукт.
7. Создавать Page Object на каждую мелочь.
8. Не смотреть trace, когда тест упал.

## 20. Хороший шаблон теста для этого репозитория

```ts
import { expect, test } from '@playwright/test';

test.describe('profile', () => {
  test('user can update profile name', async ({ page }) => {
    await page.goto('/profile');

    await page.getByLabel('Name').fill('Ivan Ivanov');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Ivan Ivanov');
  });
});
```

Если нужен стабильный технический селектор:

```html
<button data-testid="save-profile">Save</button>
```

```ts
await page.getByTestId('save-profile').click();
```

Но сначала попробуй `getByRole`.

## 21. Что отвечать на собеседовании

Коротко про Playwright:

> Playwright - это e2e-фреймворк, который управляет реальными браузерами Chromium, Firefox и WebKit. Он позволяет проверять пользовательские сценарии, работать с локаторами, ожиданиями, сетью, storage state, trace/video/screenshots и запускать тесты параллельно.

Про отличие от unit-тестов:

> Unit-тест проверяет маленькую часть логики изолированно. E2E-тест проверяет весь путь пользователя через UI, часто вместе с фронтом, бэком, авторизацией и реальным браузером. E2E дороже, поэтому ими покрывают критичные сценарии, а не всю бизнес-логику.

Про локаторы:

> Я бы выбирал user-facing локаторы: `getByRole`, `getByLabel`, `getByText`. CSS-селекторы использовал бы в последнюю очередь, потому что они хрупкие и завязаны на верстку. Для сложных случаев можно использовать `data-testid`.

Про стабильность:

> В Playwright не нужно часто писать sleep, потому что действия и assertions автоматически ждут нужного состояния. Для стабильности важны правильные локаторы, независимые тестовые данные, изоляция тестов и точные ожидания.

Про авторизацию:

> Обычно я не логинюсь через UI в каждом тесте. Я делаю setup, сохраняю `storageState`, а тесты запускаю уже с авторизованным состоянием. Сам login flow при этом покрываю отдельным тестом.

Про CI:

> В CI я включаю retries, сохраняю trace/screenshots/videos на падениях, запускаю тесты параллельно. Часто на PR достаточно Chromium smoke/e2e-набора, а полный кроссбраузерный прогон можно делать nightly или перед релизом.

Про моки:

> Playwright умеет мокать сеть через `page.route`. Это полезно для стабильных сценариев и edge cases, но если замокать все API, тест перестает быть полноценным e2e. Поэтому моки стоит использовать осознанно.

## 22. Мини-чеклист перед коммитом e2e-теста

Проверь:

- тест описывает пользовательский сценарий;
- нет `waitForTimeout`;
- локаторы через role/label/text/testId, а не случайный CSS;
- тест сам готовит нужные данные;
- тест не зависит от другого теста;
- проверяется конечный пользовательский результат;
- при падении будет понятно, что сломалось;
- тест можно запустить локально через `npm test` или точечно через `npx playwright test path/to/spec.ts`.

## 23. Что читать дальше, если захочется

Минимальный порядок:

1. Locators.
2. Auto-waiting.
3. Assertions.
4. Fixtures.
5. Authentication.
6. Trace viewer.
7. Network mocking.

Этого достаточно, чтобы писать хорошие e2e-тесты и уверенно говорить о Playwright на техническом интервью.
