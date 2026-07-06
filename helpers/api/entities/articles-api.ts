import type { Article } from '../../../data/articles';
import type { TestContext } from '../../../setup/test-context';
import { API_PREFIX, expectOk, newApiContext } from '..';
import type { PaginatedResponse } from '../../pagination';

export async function createDraftArticle(
  context: TestContext,
  author: 'writerA' | 'writerB' | 'admin' = 'writerA',
  overrides: Partial<Pick<Article, 'title' | 'content' | 'readTime'>> = {},
): Promise<Article> {
  const user = context.users[author];
  const api = await newApiContext({ storageState: user.storageStatePath });

  try {
    const response = await api.post(`${API_PREFIX}/articles`, {
      data: {
        title: overrides.title ?? `${context.runId} draft article`,
        content: overrides.content ?? `${context.runId} draft content`,
        readTime: overrides.readTime ?? 3,
      },
    });
    await expectOk(response);
    return (await response.json()) as Article;
  } finally {
    await api.dispose();
  }
}

export async function publishArticle(context: TestContext, articleId: string, author: 'writerA' | 'writerB' | 'admin' = 'writerA'): Promise<Article> {
  const user = context.users[author];
  const api = await newApiContext({ storageState: user.storageStatePath });

  try {
    const response = await api.post(`${API_PREFIX}/articles/${articleId}/publish`);
    await expectOk(response);
    return (await response.json()) as Article;
  } finally {
    await api.dispose();
  }
}

export async function listArticles(search?: string): Promise<PaginatedResponse<Article>> {
  const api = await newApiContext();

  try {
    const response = await api.get(`${API_PREFIX}/articles`, {
      params: search ? { search } : undefined,
    });
    await expectOk(response);
    return (await response.json()) as PaginatedResponse<Article>;
  } finally {
    await api.dispose();
  }
}
