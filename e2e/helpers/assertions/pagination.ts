import { expect } from '@playwright/test';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export function expectPaginationShape(payload: unknown): void {
  expect(payload).toEqual(
    expect.objectContaining({
      items: expect.any(Array),
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      hasNext: expect.any(Boolean),
    }),
  );
}
