import { request, type APIRequestContext, expect } from '@playwright/test';

export const API_PREFIX = '/api';

export function getBaseURL(): string {
  return process.env.BASE_URL ?? 'http://localhost:3000';
}

export async function newApiContext(options: { storageState?: string } = {}): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: getBaseURL(),
    storageState: options.storageState,
  });
}

export async function waitForApi(): Promise<void> {
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

export async function expectOk(response: { ok(): boolean; status(): number; text(): Promise<string> }): Promise<void> {
  if (response.ok()) {
    return;
  }

  throw new Error(`Expected successful API response, got ${response.status()}: ${await response.text()}`);
}
