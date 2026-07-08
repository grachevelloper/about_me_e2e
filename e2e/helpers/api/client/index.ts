import { expect, request, type APIRequestContext } from '@playwright/test';

export const API_PREFIX = '/api';

export function getBaseURL(): string {
  const baseURL = process.env.BASE_URL;

  if (!baseURL) {
    throw new Error('BASE_URL environment variable is required for e2e tests');
  }

  return baseURL;
}

export async function newApiContext(options: { storageState?: string } = {}): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: getBaseURL(),
    storageState: options.storageState,
  });
}

export async function waitForAppReady(): Promise<void> {
  const api = await newApiContext();

  try {
    await expect
      .poll(
        async () => {
          const [articles, todos] = await Promise.all([
            api.get(`${API_PREFIX}/articles`),
            api.get(`${API_PREFIX}/todos`),
          ]);

          return articles.ok() && todos.ok();
        },
        {
          message: 'GET /api/articles and GET /api/todos should be available',
          timeout: 60_000,
          intervals: [500, 1_000, 2_000],
        },
      )
      .toBe(true);
  } finally {
    await api.dispose();
  }
}

export const waitForApi = waitForAppReady;
