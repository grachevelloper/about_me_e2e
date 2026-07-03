
  # E2E Coverage Spec: fullstack_exemplary_app

  ## Цель

  Построить практически полное E2E-покрытие пользовательских сценариев приложения `fullstack_exemplary_app`: авторизация, статьи, черновики,
  редактор, лайки, комментарии, todo, checklist, права доступа, ошибки и навигация. Все найденные дефекты фиксировать как воспроизводимые
  баги с failing/spec reference.

  ## Репозитории

  - App under test: `../fullstack_exemplary_app`
  - E2E project: `../about_me_e2e`
  - FE: `../fullstack_exemplary_app/fe`
  - BE: `../fullstack_exemplary_app/be`

  ## Запуск

  ```bash
  cd ../fullstack_exemplary_app
  docker compose up --build

  App URL:

  http://fe_fullstack-app.localhost

  E2E:

  cd ../about_me_e2e
  BASE_URL=http://fe_fullstack-app.localhost npm test

  ## Технологии

  - Playwright
  - React FE, Ant Design, React Query
  - NestJS BE
  - Auth via httpOnly cookies: accessToken, refreshToken
  - API base path: /api

  ## Основные Routes

  - /
  - /resume
  - /articles
  - /articles/drafts
  - /articles/draft/:id
  - /articles/:id
  - /todos/new
  - /todos/:id
  - /auth/signin
  - /auth/signup
  - /user
  - /no-permission
  - * / not-found

  ## Роли

  Нужны тестовые пользователи:

  - userA: обычный Role.USER
  - userB: обычный Role.USER
  - writerA: Role.WRITER
  - writerB: Role.WRITER
  - admin: Role.ADMIN

  Важно: signup создает только Role.USER, поэтому writer и admin создавать через DB/API setup.

  ## Структура Тестов

  Создать/использовать:

  tests/auth.spec.ts
  tests/navigation.spec.ts
  tests/articles.spec.ts
  tests/article-editor.spec.ts
  tests/comments.spec.ts
  tests/todos.spec.ts
  tests/checklist.spec.ts
  tests/permissions.spec.ts
  tests/error-states.spec.ts

  tests/fixtures/app.ts
  tests/helpers/api.ts
  tests/helpers/db.ts
  tests/helpers/users.ts
  tests/helpers/articles.ts
  tests/helpers/todos.ts
  tests/helpers/comments.ts

  ## Test Setup

  Перед тестами:

  1. Дождаться доступности GET /api/articles и GET /api/todos.
  2. Сгенерировать runId, например e2e-${Date.now()}.
  3. Создавать все сущности с этим префиксом.
  4. Очищать тестовые данные до и после прогона.
  5. Создать пользователей всех ролей.
  6. Сохранить storageState:
      - .auth/userA.json
      - .auth/userB.json
      - .auth/writerA.json
      - .auth/writerB.json
      - .auth/admin.json

  ## Локаторы

  Приоритет:

  1. getByRole
  2. getByLabel
  3. getByPlaceholder
  4. visible text
  5. CSS только если другого варианта нет

  Если UI нестабилен из-за Ant Design/MDXEditor, завести технический долг: добавить data-testid в FE. Не блокировать весь план, но явно
  отметить flaky места.

  ## Auth Coverage

  Покрыть:

  - signup happy path
  - signup validation: empty fields, invalid email, password mismatch
  - signup duplicate email
  - signin happy path
  - signin wrong password
  - signin unknown user
  - logout
  - refresh token flow
  - invalid refresh token
  - anonymous cannot perform protected mutations

  Acceptance:

  - После signin/signup пользователь считается authenticated.
  - После logout protected UI/actions недоступны.
  - Ошибки auth отображаются пользователю, а не только в console/network.

  ## Navigation Coverage

  Покрыть:

  - public navigation: home, resume, articles
  - anonymous menu shows signin/signup
  - authenticated menu shows logout/user actions
  - writer sees article creation/drafts actions
  - admin sees todo creation action
  - unknown route shows not-found
  - 403 redirects to /no-permission
  - desktop and mobile smoke for main pages

  ## Articles List Coverage

  Покрыть:

  - anonymous sees published articles
  - drafts are hidden from /articles
  - article card opens /articles/:id
  - draft card opens /articles/draft/:id
  - search by title
  - tags filter if exposed in UI
  - empty list state
  - loading/skeleton state
  - failed articles request state

  ## Article Editor Coverage

  Actor: writerA.

  Покрыть:

  - create article from /articles
  - create article from /articles/drafts
  - redirect to /articles/draft/:id
  - edit title
  - edit content in MDX editor
  - edit image URL and preview
  - edit read time
  - create/select/remove tags
  - autosave survives reload
  - publish draft
  - redirect to /articles/:id
  - published article appears in /articles
  - draft disappears from /articles/drafts

  Important:

  - Editor uses debounced autosave around 5 seconds. Tests must wait for PATCH /api/articles/:id, not just DOM changes.

  ## Article Details Coverage

  Покрыть:

  - title, content, image, readTime, tags, dates
  - like article
  - unlike article
  - like count changes correctly
  - anonymous article view
  - comment block behavior for anonymous user

  ## Comments Coverage

  Targets: both article and todo.

  Покрыть:

  - create root comment
  - comment appears without reload
  - comment persists after reload
  - edit own comment
  - cancel edit
  - delete own comment
  - userB cannot edit/delete userA comment
  - admin can edit/delete userA comment
  - create reply
  - nested reply is displayed with hierarchy
  - delete parent removes child branch
  - like/unlike comment

  Potential bug to catch:

  - In Comment.tsx, reply button is shown only for users who cannot mutate the comment. This may prevent replying to own comments.

  ## Todo Coverage

  Покрыть:

  - public todo list on home page
  - open public todo details
  - anonymous can read public todo
  - anonymous cannot edit protected todo fields
  - authenticated user creates todo via /todos/new
  - required title/content validation
  - localStorage draft restores form values
  - successful create redirects to /todos/:id
  - edit todo title inline
  - edit content on blur
  - change priority
  - change state through allowed transitions
  - like/unlike todo
  - userB cannot access userA private todo
  - admin can access/edit userA todo

  ## Checklist Coverage

  Actor: owner or admin.

  Покрыть:

  - todo without checklist shows create button
  - create checklist
  - empty checklist state
  - add first item
  - add multiple items
  - update progress through Steps
  - edit item text
  - delete item through confirm modal
  - deleting completed item adjusts progress
  - reload preserves checklist

  Potential bug to catch:

  - In non-empty checklist, edit button is wrapped in add-item Popover. Verify edit mode does not accidentally open add-item UI.

  ## Permissions Coverage

  Покрыть matrix:

  - anonymous:
      - can read published articles
      - can read public todos
      - cannot create article/todo/comment/like
      - cannot read drafts

  - user:
      - can comment/like
      - cannot create articles if UI requires writer
      - can create own todos if route/action is accessible

  - writer:
      - can create/edit/publish own articles
      - cannot edit another writer’s draft

  - admin:
      - can mutate чужие comments/todos/articles where backend allows

  ## Error Coverage

  Покрыть:

  - 404 article/todo redirects or shows not-found
  - 403 redirects to /no-permission
  - failed create article shows notification
  - failed autosave shows visible error/notification
  - failed comments request does not silently break page
  - offline/network failure overlay if implemented

  ## Known Suspect Bugs To Verify

  1. Comment.tsx: author cannot reply to own comment because reply is rendered only under !canMutate.
  2. Checklist.tsx: edit button inside add-item Popover may open wrong UI.
  3. ArticleTag.tsx: uses i18n namespace articles, while locales appear under article.
  4. UserPage.tsx is effectively empty.
  5. Anonymous article/todo details may break comments because comments API requires auth.
  6. Debounced article autosave is likely flaky unless tests wait on network.
  7. Missing stable test ids for MDXEditor/AntD popovers may cause fragile selectors.

  ## Done Criteria

  - All critical user flows covered in Chromium.
  - Smoke subset passes in Firefox and WebKit.
  - Tests are isolated by runId.
  - Test data cleanup is automatic.
  - No test relies on pre-existing manual data except documented seeded public owner.
  - Every found bug has:
      - title
      - environment
      - exact steps
      - expected result
      - actual result
      - failing spec/test name
      - screenshot or trace path when available

