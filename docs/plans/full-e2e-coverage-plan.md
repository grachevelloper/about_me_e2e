# Full E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build near-complete Playwright E2E coverage for `../fullstack_exemplary_app`, including all backend endpoints, public and protected frontend routes, and all active user-facing buttons.

**Architecture:** The E2E project lives in `../about_me_e2e` and tests the real full stack app in `../fullstack_exemplary_app`. Keep tests independent: create data through API/fixtures, authenticate with per-role storage states, and clean up by `runId`. Backend API coverage and frontend UI coverage are separate suites, but they reuse the same helpers and data factories.

**Tech Stack:** Playwright Test, TypeScript, React SPA frontend, NestJS backend, Ant Design UI, React Router, TanStack Query, cookie auth with `accessToken` and `refreshToken`, API prefix `/api`.

---

## Context For Agents

- App under test: `../fullstack_exemplary_app`
- Frontend: `../fullstack_exemplary_app/fe`
- Backend: `../fullstack_exemplary_app/be`
- E2E repo: `../about_me_e2e`
- App URL: `http://fe_fullstack-app.localhost`
- API base URL: `http://fe_fullstack-app.localhost/api`
- Current E2E tests exist in root-level `tests/`, `pages/`, `fixtures/`, `data/`, `helpers/`.
- Project instruction prefers the structure below:

```text
e2e/
  tests/
  pages/
  fixtures/
  data/
  helpers/
  playwright.config.ts
```

Run app:
(Оно запущено по умолчанию, можешь скипать этот шаг)
```bash
cd ../fullstack_exemplary_app
docker compose up --build
```

Run tests:

```bash
cd ../about_me_e2e
BASE_URL=http://fe_fullstack-app.localhost npm test
```

Run focused tests:

```bash
npx playwright test e2e/tests/auth/auth.spec.ts
npx playwright test e2e/tests/api/auth.api.spec.ts
npx playwright test --project=chromium --grep "@critical"
```

## Testing Rules

- Do not adapt tests to incorrect application logic.
- If a real bug is found, keep the test as the correct expected behavior and mark it with `test.fixme(true, 'BUG: concise reason')` or tag the test title with `@bug`.
- Prefer `getByRole`, `getByLabel`, `getByPlaceholder`, and stable visible text.
- Use CSS selectors only when accessible locators are impossible.
- If Ant Design or MDXEditor makes a locator unstable, add a note in the test and create a small frontend follow-up to add `data-marker`.
- No test should depend on data created by another test.
- Use unique `runId`, for example `e2e-${Date.now()}`, in all generated names.
- Clean up created users, todos, articles, comments, likes, tags, and attachments where the backend supports it.
- Fail on unexpected `pageerror` and critical `console.error`, except explicitly documented known frontend bugs.

## Frontend Data-Marker Follow-Up

After current PR comments are fixed, add stable frontend markers for E2E-only selectors. The goal is that any agent can open this file, go to the frontend repository, and add the required `[data-marker]` attributes without guessing which elements tests need.

- [ ] In `../fullstack_exemplary_app/fe`, add markers for auth controls: `auth-email-input`, `auth-password-input`, `auth-submit`, `auth-signup-link`, `auth-signin-link`.
- [ ] Add markers for app shell and navigation: `nav-home-link`, `nav-resume-link`, `nav-articles-link`, `nav-drafts-link`, `nav-user-name`, `nav-logout-button`.
- [ ] Add markers for article list and editor flows: `article-card`, `article-title`, `draft-title-input`, `draft-content-editor`, `draft-save-button`, `draft-publish-button`.
- [ ] Add markers for todo flows: `todo-title-input`, `todo-content-input`, `todo-priority-select`, `todo-state-select`, `todo-create-button`, `todo-card`.
- [ ] Add markers for checklist and comments: `checklist-add-input`, `checklist-add-button`, `checklist-item`, `comment-input`, `comment-submit-button`.
- [ ] Update Page Objects in `e2e/pages/` to use `[data-marker="..."]` only where role, label, placeholder, or stable visible text locators are not reliable.
- [ ] Keep tests behavior-focused: marker locators are for finding controls, while assertions should still verify visible user behavior.

## Required Roles

Create these users during global setup:

- `primaryUser`: `Role.USER`
- `secondaryUser`: `Role.USER`
- `writer`: `Role.WRITER`
- `secondaryWriter`: `Role.WRITER`
- `admin`: `Role.ADMIN`

Signup creates regular users only, so `writer`, `secondaryWriter`, and `admin` must be created through DB setup, backend fixture, or privileged helper.

Persist storage states:

```text
storage/primaryUser.json
storage/secondaryUser.json
storage/writer.json
storage/secondaryWriter.json
storage/admin.json
```

## Target Routes

- `/`
- `/resume`
- `/articles`
- `/articles/drafts`
- `/articles/draft/:id`
- `/articles/:id`
- `/todos/new`
- `/todos/:id`
- `/auth/signin`
- `/auth/signup`
- `/user`
- `/no-permission`
- unknown route, for example `/definitely-not-existing-route`

## Target Backend Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/check`
- `GET /api/auth/me`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/users/me/password`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/password`
- `DELETE /api/users/:id`
- `POST /api/todos`
- `GET /api/todos`
- `GET /api/todos/:id`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `POST /api/todos/:todoId/checklist`
- `GET /api/todos/:todoId/checklist`
- `POST /api/todos/:todoId/checklist/items`
- `PATCH /api/todos/:todoId/checklist/items/:index`
- `PATCH /api/todos/:todoId/checklist/progress`
- `DELETE /api/todos/:todoId/checklist/items/:index`
- `DELETE /api/todos/:todoId/checklist`
- `POST /api/articles`
- `GET /api/articles`
- `GET /api/articles/drafts`
- `GET /api/articles/author/:authorId`
- `GET /api/articles/:id`
- `PATCH /api/articles/:id`
- `DELETE /api/articles/:id`
- `POST /api/articles/:id/publish`
- `POST /api/tags`
- `GET /api/tags`
- `PATCH /api/tags/:id`
- `DELETE /api/tags/:id`
- `POST /api/comments`
- `GET /api/comments/:id`
- `GET /api/comments/:entityType/:entityId`
- `PATCH /api/comments/:id`
- `DELETE /api/comments/:id`
- `POST /api/likes/:entityType/:entityId`
- `DELETE /api/likes/:entityType/:entityId`
- `POST /api/attachments/:entityType/:entityId`
- `DELETE /api/attachments/:id`

---

## Task 1: Normalize E2E Structure

**Files:**
- Create: `e2e/tests/api/`
- Create: `e2e/tests/auth/`
- Create: `e2e/tests/navigation/`
- Create: `e2e/tests/todos/`
- Create: `e2e/tests/articles/`
- Create: `e2e/tests/comments/`
- Create: `e2e/tests/likes/`
- Create: `e2e/tests/attachments/`
- Create: `e2e/tests/permissions/`
- Create: `e2e/tests/errors/`
- Create: `e2e/tests/responsive/`
- Create: `e2e/pages/`
- Create: `e2e/fixtures/`
- Create: `e2e/data/`
- Create: `e2e/helpers/`
- Create: `e2e/playwright.config.ts`
- Migrate or re-export from existing root `tests/`, `pages/`, `fixtures/`, `data/`, `helpers/`.

- [ ] Create the `e2e/` directory structure above.
- [ ] Move existing specs into matching domain folders or leave temporary re-export wrappers while migration is in progress.
- [ ] Move Page Objects into `e2e/pages`.
- [ ] Move fixtures into `e2e/fixtures`.
- [ ] Move test data factories into `e2e/data`.
- [ ] Move API/browser/db helpers into `e2e/helpers`.
- [ ] Update imports so all tests run from the new structure.
- [ ] Update `package.json` script to run `playwright test -c e2e/playwright.config.ts`.
- [ ] Run `npm test -- --list` and verify Playwright discovers all migrated specs.

## Task 2: Test Infrastructure And Fixtures

**Files:**
- Create or modify: `e2e/fixtures/test.ts`
- Create or modify: `e2e/setup/global-setup.ts`
- Create or modify: `e2e/setup/test-context.ts`
- Create or modify: `e2e/helpers/api/index.ts`
- Create or modify: `e2e/helpers/browser-context.ts`
- Create or modify: `e2e/helpers/db.ts`
- Create or modify: `e2e/data/users.ts`
- Create or modify: `e2e/data/todos.ts`
- Create or modify: `e2e/data/articles.ts`
- Create or modify: `e2e/data/files.ts`

- [ ] Require `BASE_URL`; fail fast with a clear error if it is not set.
- [ ] Add `API_PREFIX = '/api'`.
- [ ] Add `waitForAppReady()` that checks `GET /api/articles` and `GET /api/todos`.
- [ ] Add `runId` to global test context.
- [ ] Add API contexts for guest and each role.
- [ ] Add authenticated browser contexts for `primaryUser`, `secondaryUser`, `writer`, `secondaryWriter`, and `admin`.
- [ ] Add data factories for valid and invalid users, todos, articles, comments, tags, and upload files.
- [ ] Add cleanup helpers for all created entities.
- [ ] Add shared assertions for status codes, redirects, cookies, and pagination shape.
- [ ] Configure trace, screenshot, and video on failure.
- [ ] Configure unexpected `pageerror` and critical `console.error` failure handling.

## Task 3: Backend API Coverage - Auth

**Files:**
- Create: `e2e/tests/api/auth.api.spec.ts`
- Use helpers from: `e2e/helpers/api/index.ts`, `e2e/data/users.ts`

- [ ] `POST /auth/signup` creates a user, returns no password, and sets `accessToken` and `refreshToken` cookies.
- [ ] `POST /auth/signup` rejects invalid email.
- [ ] `POST /auth/signup` rejects empty username.
- [ ] `POST /auth/signup` rejects password shorter than 8 chars.
- [ ] `POST /auth/signup` rejects password without uppercase, lowercase, or digit.
- [ ] `POST /auth/signup` rejects duplicate email.
- [ ] `POST /auth/signin` authenticates valid credentials and sets cookies.
- [ ] `POST /auth/signin` rejects wrong password.
- [ ] `POST /auth/signin` rejects unknown email.
- [ ] `POST /auth/signin` rejects malformed email.
- [ ] `POST /auth/refresh` refreshes tokens with a valid refresh cookie.
- [ ] `POST /auth/refresh` returns 401 without refresh cookie.
- [ ] `POST /auth/refresh` returns 401 with invalid refresh cookie.
- [ ] `POST /auth/logout` clears cookies and invalidates refresh token.
- [ ] `POST /auth/logout` returns 401 for guest.
- [ ] `GET /auth/check` returns true for authenticated user.
- [ ] `GET /auth/check` returns 401 for guest.
- [ ] `GET /auth/me` returns the current user.
- [ ] `GET /auth/me` returns 401 for guest.

## Task 4: Backend API Coverage - Users

**Files:**
- Create: `e2e/tests/api/users.api.spec.ts`

- [ ] `GET /users/me` returns self for user, writer, and admin.
- [ ] `PATCH /users/me` updates `username`.
- [ ] `PATCH /users/me` updates `avatar`.
- [ ] `PATCH /users/me` updates `nowReading`, `nowWatch`, `nowListening`, and `nowBeingIn`.
- [ ] `PATCH /users/me` rejects unknown fields because whitelist and `forbidNonWhitelisted` are enabled.
- [ ] `PATCH /users/me/password` changes own password.
- [ ] Old password fails after successful password change.
- [ ] New password succeeds after successful password change.
- [ ] `PATCH /users/me/password` rejects wrong `currentPassword`.
- [ ] `PATCH /users/me/password` rejects weak `newPassword`.
- [ ] `GET /users/:id` allows admin to read another user.
- [ ] `GET /users/:id` handles ordinary user reading another user according to actual authorization rules.
- [ ] `PATCH /users/:id` allows admin to update another user.
- [ ] `PATCH /users/:id` prevents ordinary user from updating another user.
- [ ] `PATCH /users/:id/password` allows admin to change another user's password.
- [ ] `PATCH /users/:id/password` prevents ordinary user from changing another user's password.
- [ ] `DELETE /users/:id` allows admin to delete a user.
- [ ] Deleted user cannot sign in.
- [ ] `DELETE /users/:id` prevents non-admin deletion.
- [ ] Invalid UUID path params return 400.

## Task 5: Backend API Coverage - Todos

**Files:**
- Create: `e2e/tests/api/todos.api.spec.ts`

- [ ] `POST /todos` creates todo with required `title` and `content`.
- [ ] `POST /todos` accepts priorities `Low`, `Medium`, `High`, and `Super`.
- [ ] `POST /todos` accepts states `In_work`, `Planning`, `Finished`, and `Canceled`.
- [ ] `POST /todos` returns 401 for guest.
- [ ] `POST /todos` rejects empty `title`.
- [ ] `POST /todos` rejects empty `content`.
- [ ] `POST /todos` rejects invalid priority enum.
- [ ] `POST /todos` rejects invalid state enum.
- [ ] `POST /todos` rejects unknown fields.
- [ ] `GET /todos` is public.
- [ ] `GET /todos` returns pagination fields `items`, `page`, `limit`, `total`, and `hasNext`.
- [ ] `GET /todos?page=1&limit=1` returns one item and correct pagination.
- [ ] `GET /todos?limit=101` returns 400.
- [ ] `GET /todos?page=0` returns 400.
- [ ] `GET /todos/:id` is public for existing todo.
- [ ] `GET /todos/:id` returns 400 for invalid UUID.
- [ ] `GET /todos/:id` returns 404 for missing UUID.
- [ ] `PATCH /todos/:id` updates `title`.
- [ ] `PATCH /todos/:id` updates `content`.
- [ ] `PATCH /todos/:id` updates `priority`.
- [ ] `PATCH /todos/:id` updates `state`.
- [ ] `PATCH /todos/:id` returns 401 for guest.
- [ ] `PATCH /todos/:id` prevents non-owner mutation if service requires ownership.
- [ ] `DELETE /todos/:id` deletes a todo.
- [ ] Deleted todo returns 404.
- [ ] `DELETE /todos/:id` returns 401 for guest.
- [ ] `DELETE /todos/:id` prevents non-owner deletion if service requires ownership.

## Task 6: Backend API Coverage - Checklist

**Files:**
- Create: `e2e/tests/api/checklist.api.spec.ts`

- [x] `POST /todos/:todoId/checklist` creates an empty checklist.
- [x] `GET /todos/:todoId/checklist` returns the created checklist.
- [x] `POST /todos/:todoId/checklist/items` adds an item.
- [x] `POST /items` rejects empty `text`.
- [x] `PATCH /items/:index` updates item text.
- [x] `PATCH /items/:index` rejects negative index.
- [x] `PATCH /items/:index` rejects non-number index.
- [x] `PATCH /items/:index` rejects out-of-range index.
- [x] `PATCH /progress` increments progress.
- [x] `PATCH /progress` decrements progress.
- [x] `PATCH /progress` does not allow progress below zero.
- [x] `PATCH /progress` does not allow progress above item count.
- [x] `DELETE /items/:index` removes an item.
- [x] Removing a completed item keeps progress valid.
- [x] `DELETE /checklist` deletes checklist.
- [x] Deleted checklist returns expected missing state.
- [x] Guest requests return 401.
- [x] Non-owner requests return 403 if ownership is enforced.
- [x] Invalid todo UUID returns 400.
- [x] Missing todo returns 404.

## Task 7: Backend API Coverage - Articles

**Files:**
- Create: `e2e/tests/api/articles.api.spec.ts`

- [x] `POST /articles` creates a draft for writer.
- [x] `POST /articles` creates a draft for admin.
- [x] `POST /articles` prevents guest.
- [x] `POST /articles` prevents ordinary user if write role is required.
- [x] `POST /articles` rejects empty title.
- [x] `POST /articles` rejects empty content.
- [x] `POST /articles` rejects `readTime` less than 1.
- [x] `POST /articles` accepts tags array.
- [x] `GET /articles` is public.
- [x] `GET /articles` returns published articles.
- [x] `GET /articles` does not return drafts.
- [x] `GET /articles` supports pagination.
- [x] `GET /articles` supports `search`.
- [x] `GET /articles` supports `authorId`.
- [x] `GET /articles` supports comma-separated `tags`.
- [x] `GET /articles` supports `minLikes`.
- [x] `GET /articles` supports `createdAfter`.
- [x] `GET /articles` supports `sortBy=createdAt`.
- [x] `GET /articles` supports `sortBy=updatedAt`.
- [x] `GET /articles` supports `order=ASC` and `order=DESC`.
- [x] `GET /articles/drafts` returns writer's own drafts.
- [x] `GET /articles/drafts` returns 401 for guest.
- [x] `GET /articles/author/:authorId` is public.
- [x] `GET /articles/:id` returns published article for guest.
- [x] `GET /articles/:id` returns own draft for author.
- [x] `GET /articles/:id` prevents another writer from reading private draft.
- [x] `PATCH /articles/:id` updates title.
- [x] `PATCH /articles/:id` updates content.
- [x] `PATCH /articles/:id` updates image URL.
- [x] `PATCH /articles/:id` rejects invalid image URL.
- [x] `PATCH /articles/:id` updates readTime.
- [x] `PATCH /articles/:id` updates tags.
- [x] `PATCH /articles/:id` prevents another writer from editing draft.
- [x] `POST /articles/:id/publish` publishes draft.
- [x] Published draft appears in `GET /articles`.
- [x] `DELETE /articles/:id` deletes own article.
- [x] Deleted article returns 404.

## Task 8: Backend API Coverage - Tags

**Files:**
- Create: `e2e/tests/api/tags.api.spec.ts`

- [x] `POST /tags` creates tag.
- [x] `GET /tags` returns created tag.
- [x] `PATCH /tags/:id` renames tag.
- [x] `DELETE /tags/:id` removes tag.
- [x] Empty tag name returns validation error if DTO enforces it.
- [x] Duplicate tag name returns conflict or documented behavior.
- [x] Invalid UUID returns 400.
- [x] Deleting tag used by article returns documented behavior.
- [x] Verify whether tag mutation endpoints require auth. If they are unintentionally public, add `test.fixme(true, 'BUG: tag mutations are public')`.

## Task 9: Backend API Coverage - Comments

**Files:**
- Create: `e2e/tests/api/comments.api.spec.ts`

- [x] `POST /comments` creates root comment for article.
- [x] `POST /comments` creates root comment for todo.
- [x] `POST /comments` creates reply with `parentId`.
- [x] Reply has correct `depth`.
- [x] `GET /comments/:id` returns created comment.
- [x] `GET /comments/:entityType/:entityId` lists article comments.
- [x] `GET /comments/:entityType/:entityId` lists todo comments.
- [x] Listing supports `order=ASC`.
- [x] Listing supports `order=DESC`.
- [x] Listing supports `page` and `limit`.
- [x] `PATCH /comments/:id` lets author edit.
- [x] `DELETE /comments/:id` lets author delete.
- [x] Admin can delete another user's comment if service supports moderation.
- [x] Guest requests return 401.
- [x] Empty content returns 400.
- [x] Invalid `entityType` returns 400.
- [x] Invalid UUID returns 400.
- [x] Non-author mutation returns 403.
- [x] Parent comment from another entity is rejected.

## Task 10: Backend API Coverage - Likes

**Files:**
- Create: `e2e/tests/api/likes.api.spec.ts`

- [x] `POST /likes/article/:id` likes article.
- [x] `DELETE /likes/article/:id` unlikes article.
- [x] Article `likesCount` and `hasLiked` update after like and unlike.
- [x] `POST /likes/todo/:id` likes todo.
- [x] `DELETE /likes/todo/:id` unlikes todo.
- [x] Todo `likesCount` and `hasLiked` update after like and unlike.
- [x] `POST /likes/comment/:id` likes comment.
- [x] `DELETE /likes/comment/:id` unlikes comment.
- [x] Comment `likesCount` and `hasLiked` update after like and unlike.
- [x] Repeated like by same user does not create duplicate.
- [x] Unlike without existing like returns documented behavior.
- [x] Guest requests return 401.
- [x] Invalid entity type returns 400.
- [x] Invalid UUID returns 400.
- [x] Missing entity returns 404.

## Task 11: Backend API Coverage - Attachments

**Files:**
- Create: `e2e/tests/api/attachments.api.spec.ts`
- Create test files in: `e2e/data/files/`

- [x] `POST /attachments/user/:id` uploads jpeg.
- [x] `POST /attachments/article/:id` uploads png.
- [x] `POST /attachments/todo/:id` uploads webp.
- [x] Upload response includes `id`, `url`, `mimeType`, `size`, and `createdAt`.
- [x] `DELETE /attachments/:id` deletes uploaded attachment.
- [x] Deleted attachment cannot be deleted again or returns documented behavior.
- [x] Guest upload returns 401.
- [x] Text file upload is rejected.
- [x] PDF upload is rejected.
- [x] GIF upload is rejected.
- [x] File larger than 10 MB is rejected.
- [x] Missing file returns 400.
- [x] Invalid entity type returns 400.
- [x] Invalid UUID returns 400.
- [x] Upload to another user's protected entity returns 403 if ownership is enforced.

## Task 12: Frontend Page Objects

**Files:**
- Create or modify: `e2e/pages/navigation/AppShell.ts`
- Create or modify: `e2e/pages/auth/LoginPage.ts`
- Create or modify: `e2e/pages/auth/RegistrationPage.ts`
- Create or modify: `e2e/pages/todos/NewTodoPage.ts`
- Create or modify: `e2e/pages/todos/TodoDetailsPage.ts`
- Create or modify: `e2e/pages/todos/ChecklistPanel.ts`
- Create or modify: `e2e/pages/articles/ArticlesPage.ts`
- Create or modify: `e2e/pages/articles/DraftsPage.ts`
- Create or modify: `e2e/pages/articles/DraftEditorPage.ts`
- Create or modify: `e2e/pages/articles/ArticlePage.ts`
- Create or modify: `e2e/pages/comments/CommentsPanel.ts`
- Create or modify: `e2e/pages/errors/ErrorPage.ts`

- [ ] Add route opening methods for all target routes.
- [ ] Add methods for all layout navigation items.
- [ ] Add methods for guest/user/writer/admin action menu items.
- [ ] Add methods for auth forms and signup wizard steps.
- [ ] Add methods for todo create/edit/like/priority/state.
- [ ] Add methods for checklist create/add/edit/delete/progress.
- [ ] Add methods for articles list, draft list, editor fields, publish buttons, tags, and view mode toggle.
- [ ] Add methods for article/todo comments: create, reply, edit, delete, like.
- [ ] Add methods for error pages and back buttons.
- [ ] Keep selectors accessible-first and avoid brittle Ant Design DOM selectors where possible.

## Task 13: Frontend Coverage - Navigation And Layout

**Files:**
- Create: `e2e/tests/navigation/navigation.spec.ts`

- [ ] Guest can open `/`, `/resume`, and `/articles`.
- [ ] Main nav Home opens `/`.
- [ ] Main nav Resume opens `/resume`.
- [ ] Main nav Articles opens `/articles`.
- [ ] Guest Sign in action opens `/auth/signin`.
- [ ] Guest Sign up action opens `/auth/signup`.
- [ ] User Suggest action opens todo suggestion modal.
- [ ] User logout action opens logout dialog.
- [ ] Logout cancel keeps user authenticated.
- [ ] Logout confirm clears session and guest actions return.
- [ ] Writer Drafts nav opens `/articles/drafts`.
- [ ] Writer Create article action creates draft and opens `/articles/draft/:id`.
- [ ] Admin Create todo action opens `/todos/new`.
- [ ] Admin Create article action creates draft and opens `/articles/draft/:id`.
- [ ] Sidebar collapse and expand buttons work on desktop.
- [ ] Mobile navigation remains clickable and does not cover page content.
- [ ] Cookie notification Accept hides notification and persists acceptance.
- [ ] Footer Telegram button opens external Telegram URL.
- [ ] Footer email button has `mailto:` href.
- [ ] Unknown route renders not-found page.
- [ ] `/no-permission` renders permission page.
- [ ] Status page back button navigates back.
- [ ] Direct reload works on all public routes.

## Task 14: Frontend Coverage - Auth UI

**Files:**
- Create: `e2e/tests/auth/auth.spec.ts`

- [ ] Signup wizard starts on intro step.
- [ ] Signup Next moves to username step.
- [ ] Username Next is disabled until username is valid.
- [ ] Signup Previous returns to previous step.
- [ ] Email validation is shown for malformed email.
- [ ] Password validation is shown for invalid password.
- [ ] Confirm password mismatch is shown.
- [ ] Successful signup reaches final congratulations step.
- [ ] Final signup action returns to home.
- [ ] Duplicate signup email shows user-visible error and stays in wizard.
- [ ] Signin validates malformed email.
- [ ] Signin with wrong password shows user-visible error.
- [ ] Signin with valid credentials redirects home.
- [ ] Auth floating navigate button can switch from signin to signup.
- [ ] Auth floating navigate button can switch from signup to signin.
- [ ] Authenticated refresh restores session after page reload.

## Task 15: Frontend Coverage - Main Page And Todos

**Files:**
- Create: `e2e/tests/todos/todos.spec.ts`

- [ ] Main page renders about/current sections and todo table.
- [ ] Clicking a todo row opens `/todos/:id`.
- [ ] Guest can open todo details.
- [ ] Todo details render title and content.
- [ ] Authenticated user can like and unlike todo from details page.
- [ ] Todo like count persists after reload.
- [ ] Todo title inline edit saves after edit ends.
- [ ] Todo title edit persists after reload.
- [ ] Todo content textarea saves on blur.
- [ ] Todo content edit persists after reload.
- [ ] Priority popover opens.
- [ ] Each priority option can be selected and persisted.
- [ ] State popover opens.
- [ ] Each state option can be selected and persisted.
- [ ] Admin can open `/todos/new`.
- [ ] Create todo back button navigates back.
- [ ] Create todo cancel button navigates back.
- [ ] Create todo validates required title.
- [ ] Create todo validates required content.
- [ ] Create todo draft persists in localStorage after reload.
- [ ] Create todo can select priority and state.
- [ ] Create todo submit creates todo and redirects to details.
- [ ] Guest cannot perform protected todo mutations.
- [ ] User/writer cannot access admin-only create todo action if that is required by product rules.

## Task 16: Frontend Coverage - Checklist UI

**Files:**
- Create: `e2e/tests/todos/checklist.spec.ts`

- [ ] Todo without checklist shows create checklist button in card extra.
- [ ] Todo without checklist shows create checklist button in empty state.
- [ ] Create checklist button creates checklist.
- [ ] Empty checklist shows add first item button.
- [ ] Add first item opens popover.
- [ ] Empty add item input keeps submit disabled.
- [ ] Valid add item input creates first item.
- [ ] Header add item button creates another item.
- [ ] Edit mode button switches to editing.
- [ ] Finish button exits editing.
- [ ] In edit mode, item edit button opens inline editor.
- [ ] Save checkmark persists edited item text.
- [ ] Cancel cross cancels edited item text.
- [ ] Delete item opens confirm modal.
- [ ] Delete cancel keeps item.
- [ ] Delete confirm removes item.
- [ ] Clicking a step changes progress.
- [ ] Progress persists after reload.
- [ ] Deleting completed item keeps progress valid.
- [ ] Non-owner cannot mutate checklist if ownership is enforced.

## Task 17: Frontend Coverage - Articles List

**Files:**
- Create: `e2e/tests/articles/articles.spec.ts`

- [ ] Guest sees published article cards.
- [ ] Guest does not see draft article cards.
- [ ] Clicking published article card opens `/articles/:id`.
- [ ] Empty article list renders empty state.
- [ ] Loading article list renders skeletons under throttled route.
- [ ] Writer sees Create article button.
- [ ] Admin sees Create article button.
- [ ] Guest does not see Create article button.
- [ ] Ordinary user does not see Create article button.
- [ ] Create article button creates draft and opens editor.
- [ ] Draft card click for author opens `/articles/draft/:id`.
- [ ] Search input filters articles by query. If it does not affect the list, mark as `test.fixme(true, 'BUG: articles search input is not wired to API query')`.

## Task 18: Frontend Coverage - Drafts And Article Editor

**Files:**
- Create: `e2e/tests/articles/article-editor.spec.ts`
- Create: `e2e/tests/articles/drafts.spec.ts`

- [ ] Writer can open `/articles/drafts`.
- [ ] Admin can open `/articles/drafts` if product rules allow it.
- [ ] Guest cannot open `/articles/drafts`.
- [ ] Ordinary user cannot open `/articles/drafts`.
- [ ] Drafts list shows own drafts.
- [ ] Drafts list does not show another writer's drafts.
- [ ] Clicking draft opens editor.
- [ ] Editor renders title, content, tags, image, and readTime.
- [ ] Title input autosaves after debounce.
- [ ] Title change persists after reload.
- [ ] MD editor content autosaves after debounce.
- [ ] Content change persists after reload.
- [ ] Image URL input autosaves.
- [ ] Image preview appears for valid image URL.
- [ ] ReadTime input autosaves and enforces minimum 1.
- [ ] TagsSelect can add existing tag.
- [ ] TagsWrapper delete removes tag.
- [ ] Expand icon expands long tag list.
- [ ] Header Publish button publishes draft and opens public article route.
- [ ] Footer Publish button publishes draft and opens public article route.
- [ ] Published article appears in `/articles`.
- [ ] Another writer opening draft editor redirects to `/no-permission`.
- [ ] ViewModeToggle changes editor layout/collapsed reading mode.
- [ ] Autosave 500 response shows notification or visible error state.

## Task 19: Frontend Coverage - Article Page

**Files:**
- Create: `e2e/tests/articles/article-page.spec.ts`

- [ ] Published article renders title.
- [ ] Published article renders image when image exists.
- [ ] Published article renders tags.
- [ ] Published article renders read time.
- [ ] Published article renders created and updated dates.
- [ ] Published article renders content.
- [ ] Guest can open published article.
- [ ] Guest does not see new comment form.
- [ ] Authenticated user sees new comment form.
- [ ] Authenticated user can like and unlike article.
- [ ] Article like button updates count and `aria-pressed`.
- [ ] Missing article redirects or renders not-found state.

## Task 20: Frontend Coverage - Comments UI

**Files:**
- Create: `e2e/tests/comments/comments.spec.ts`

- [ ] Authenticated user creates root comment on article.
- [ ] Authenticated user creates root comment on todo.
- [ ] Empty comment textarea keeps create button disabled.
- [ ] Reply button opens reply form.
- [ ] Reply cancel closes reply form.
- [ ] Reply create adds nested comment.
- [ ] Author can edit own comment.
- [ ] Edited comment text persists after reload.
- [ ] Author can delete own comment.
- [ ] Deleted comment disappears.
- [ ] User can like and unlike comment.
- [ ] Comment like count persists after reload.
- [ ] Admin can edit/delete another user's comment if backend supports it.
- [ ] Ordinary user cannot see edit/delete buttons on another user's comment.
- [ ] Verify current behavior where author cannot reply to own comment because reply button renders only for `!canMutate`. If product expects authors to reply to own comments, mark test as `test.fixme(true, 'BUG: comment author cannot reply to own comment')`.

## Task 21: Frontend Coverage - User/Profile Route

**Files:**
- Create: `e2e/tests/users/user-page.spec.ts`
- Create: `e2e/tests/api/users.api.spec.ts` if not already created in Task 4.

- [ ] Authenticated user can open `/user` without app crash.
- [ ] Guest opening `/user` gets expected auth redirect, no-permission page, or documented public empty state.
- [ ] Record that frontend user profile edit UI is currently missing while backend supports user update and password change.
- [ ] Keep full users coverage in API tests until profile UI exists.

## Task 22: Frontend Coverage - Attachments UI And MD Editor

**Files:**
- Create: `e2e/tests/attachments/attachments.spec.ts`

- [ ] If MD editor exposes image upload, upload valid image and verify attachment API response is reflected in editor content.
- [ ] If no visible attachment upload UI exists, keep attachments as API-only coverage and document missing UI in test comments.
- [ ] Verify editor link creation button does not break content editing.
- [ ] Verify editor basic markdown input persists in article content.

## Task 23: Permissions Matrix

**Files:**
- Create: `e2e/tests/permissions/permissions.spec.ts`

- [ ] Guest can open `/`, `/resume`, `/articles`, published `/articles/:id`, and public `/todos/:id`.
- [ ] Guest cannot call protected API mutations.
- [ ] Guest cannot open drafts page.
- [ ] User can suggest todo, comment, and like.
- [ ] User cannot create article if writer role is required.
- [ ] User cannot open drafts page.
- [ ] User cannot create admin todo if admin role is required.
- [ ] Writer can create article draft.
- [ ] Writer can edit own draft.
- [ ] Writer can publish own draft.
- [ ] Writer cannot edit another writer's draft.
- [ ] Writer cannot access admin-only user operations.
- [ ] Admin can create todo.
- [ ] Admin can create article.
- [ ] Admin can moderate users/comments/articles/todos according to backend service rules.
- [ ] 401 behavior does not leave UI in a broken state.
- [ ] 403 redirects to `/no-permission`.
- [ ] 404 redirects to `/not-found`.

## Task 24: Error, Network, Reload, And Offline States

**Files:**
- Create: `e2e/tests/errors/error-states.spec.ts`

- [ ] Articles list handles API 500 without infinite skeleton.
- [ ] Todo details handles API 500 with visible error state.
- [ ] Comments list handles API 500 with visible error text.
- [ ] Article editor autosave handles API 500 with notification/error.
- [ ] Browser offline state shows offline overlay.
- [ ] Returning online hides offline overlay or restores app usability.
- [ ] Direct reload works on `/`.
- [ ] Direct reload works on `/resume`.
- [ ] Direct reload works on `/articles`.
- [ ] Direct reload works on `/articles/:id`.
- [ ] Direct reload works on `/articles/drafts` with writer session.
- [ ] Direct reload works on `/articles/draft/:id` with author session.
- [ ] Direct reload works on `/todos/new` with admin session.
- [ ] Direct reload works on `/todos/:id`.
- [ ] Direct reload works on `/auth/signin`.
- [ ] Direct reload works on `/auth/signup`.

## Task 25: Responsive And Accessibility Smoke

**Files:**
- Create: `e2e/tests/responsive/responsive.spec.ts`
- Create: `e2e/tests/responsive/accessibility-smoke.spec.ts`

- [ ] Desktop navigation is visible and clickable.
- [ ] Mobile navigation is visible and clickable.
- [ ] Mobile sidebar/menu does not permanently cover content.
- [ ] Auth forms fit mobile viewport.
- [ ] Todo details content, checklist, and comments do not overlap on mobile.
- [ ] Article page content does not overlap on mobile.
- [ ] Article editor controls remain reachable on mobile.
- [ ] Primary buttons have accessible names.
- [ ] Like buttons expose `aria-label` and `aria-pressed`.
- [ ] Forms are usable with labels/placeholders.
- [ ] Enter key submits signin form.
- [ ] Enter key works for checklist add item.

## Task 26: Current Coverage Gap Audit

**Files:**
- Modify or replace current specs under `tests/` during migration.

Current tests cover only these small slices:

- Signup success.
- Signin wrong password.
- Signin success.
- Anonymous protected mutation rejection for todo create.
- One todo create/read path.
- Checklist area visibility only.
- Published article visibility vs draft invisibility.
- Writer opening own draft editor.
- One API comment creation.
- Basic navigation smoke.
- A few permissions checks.

- [ ] Replace smoke-only tests with the full API and UI suites above.
- [ ] Keep existing useful Page Objects and extend them.
- [ ] Remove duplicated root-level specs after `e2e/` migration is complete.
- [ ] Add `@critical` tags to auth, permissions, create todo, publish article, and comments smoke tests.
- [ ] Add `@bug` or `test.fixme` markers for confirmed application defects.

## Completion Criteria

- [ ] `npm test -- --list` shows all suites under `e2e/tests`.
- [ ] API suites cover every backend controller route listed in this plan.
- [ ] UI suites click every active navigation/action/form button identified in frontend code.
- [ ] Role matrix covers guest, user, writer, and admin.
- [ ] Tests are independent and pass in parallel except tests explicitly marked as serial for shared browser state.
- [ ] Known product defects are represented by `test.fixme` or `@bug`, not hidden by weak assertions.
- [ ] Playwright report contains traces/screenshots/videos for failures.
- [ ] Final verification command succeeds:

```bash
BASE_URL=http://fe_fullstack-app.localhost npm test
```

Expected final result: all non-`fixme` tests pass; known bugs remain visible as skipped/fixme or tagged failing tests depending on chosen repository convention.
