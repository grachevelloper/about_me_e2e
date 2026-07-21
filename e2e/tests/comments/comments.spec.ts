import { test, expect } from '../../fixtures/test';
import { createDraftArticle, publishArticle } from '../../helpers/api/entities/articles-api';
import { createComment } from '../../helpers/api/entities/comments-api';
import { createTodo } from '../../helpers/api/entities/todos-api';
import { createAuthenticatedPage } from '../../helpers/browser/context';
import { ArticlePage } from '../../pages/articles/ArticlePage';
import { TodoDetailsPage } from '../../pages/todos/TodoDetailsPage';

test.describe('comments', () => {
  test('@critical authenticated user creates root comment on article', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-article-comment`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const commentText = `${label} root comment`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.create(commentText);
    await session.articlePage.comments.expectCommentVisible(commentText);

    await session.close();
  });

  test('authenticated user creates root comment on todo', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-todo-comment`;
    const todo = await createTodo(app, 'primaryUser', {
      title: `${label} todo`,
      content: `${label} todo content`,
    });
    const commentText = `${label} root comment`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      todoDetailsPage: new TodoDetailsPage(page),
    }));

    await session.todoDetailsPage.open(todo.id);
    await session.todoDetailsPage.comments.create(commentText);
    await session.todoDetailsPage.comments.expectCommentVisible(commentText);

    await session.close();
  });

  test('empty comment textarea keeps create button disabled', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-empty`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.expectCreateDisabled();

    await session.close();
  });

  test('reply form can be opened, canceled, and used to create nested comment', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-reply`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const root = `${label} root`;
    const reply = `${label} reply`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.create(root);
    await session.articlePage.comments.openReply(root);
    await session.articlePage.comments.expectReplyFormVisible();
    await session.articlePage.comments.cancelReply();
    await session.articlePage.comments.expectNoReplyFormVisible();
    await session.articlePage.comments.replyTo(root, reply);
    await session.articlePage.comments.expectCommentVisible(reply);

    await session.close();
  });

  test('author can edit own comment and edited text persists after reload', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-edit`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = await createComment(app, 'article', article.id, 'primaryUser');
    const nextText = `${label} edited comment`;
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.edit(comment.content, nextText);
    await session.articlePage.comments.expectCommentVisible(nextText);

    await session.page.reload();
    await session.articlePage.comments.expectCommentVisible(nextText);

    await session.close();
  });

  test('author can delete own comment and deleted comment disappears', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-delete`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = await createComment(app, 'article', article.id, 'primaryUser');
    const session = await createAuthenticatedPage(browser, app, 'primaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.delete(comment.content);
    await session.articlePage.comments.confirmDelete();
    await session.articlePage.comments.expectCommentHidden(comment.content);

    await session.close();
  });

  test('user can like and unlike comment and count persists after reload', async ({ browser, app }, testInfo) => {

    const label = `${app.runId}-${testInfo.project.name}-like`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = await createComment(app, 'article', article.id, 'primaryUser');
    const session = await createAuthenticatedPage(browser, app, 'secondaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.like(comment.content);
    await expect(session.articlePage.comments.comment(comment.content)).toContainText('1');

    await session.page.reload();
    await expect(session.articlePage.comments.comment(comment.content)).toContainText('1');

    await session.articlePage.comments.like(comment.content);
    await expect(session.articlePage.comments.comment(comment.content)).toContainText('0');

    await session.close();
  });

  test('admin can edit or delete another user comment if moderation is supported', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-admin`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = await createComment(app, 'article', article.id, 'primaryUser');
    const session = await createAuthenticatedPage(browser, app, 'admin', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.expectOwnMutationControlsVisible(comment.content);
    await session.articlePage.comments.delete(comment.content);
    await session.articlePage.comments.confirmDelete();
    await session.articlePage.comments.expectCommentHidden(comment.content);

    await session.close();
  });

  test('ordinary user cannot see edit or delete buttons on another user comment', async ({ browser, app }, testInfo) => {
    const label = `${app.runId}-${testInfo.project.name}-non-author`;
    const draft = await createDraftArticle(app, 'writer', {
      title: `${label} article`,
      content: `${label} article content`,
    });
    const article = await publishArticle(app, draft.id, 'writer');
    const comment = await createComment(app, 'article', article.id, 'primaryUser');
    const session = await createAuthenticatedPage(browser, app, 'secondaryUser', (page) => ({
      articlePage: new ArticlePage(page),
    }));

    await session.articlePage.open(article.id);
    await session.articlePage.comments.expectCommentVisible(comment.content);
    await session.articlePage.comments.expectOwnMutationControlsHidden(comment.content);

    await session.close();
  });
});
