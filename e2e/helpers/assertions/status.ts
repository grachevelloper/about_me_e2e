import { expect, type APIResponse } from '@playwright/test';

export async function expectOk(response: APIResponse): Promise<void> {
  if (response.ok()) {
    return;
  }

  throw new Error(`Expected successful API response, got ${response.status()}: ${await response.text()}`);
}

export async function expectStatus(response: APIResponse, status: number): Promise<void> {
  expect(response.status(), await response.text()).toBe(status);
}

export function expectNoPassword(payload: unknown): void {
  expect(payload).not.toHaveProperty('password');
}

export function expectAuthCookies(response: APIResponse): void {
  const setCookie = response.headersArray().filter((header) => header.name.toLowerCase() === 'set-cookie').map((header) => header.value);

  expect(setCookie.some((cookie) => cookie.startsWith('accessToken='))).toBe(true);
  expect(setCookie.some((cookie) => cookie.startsWith('refreshToken='))).toBe(true);
}

export function expectClearedAuthCookies(response: APIResponse): void {
  const setCookie = response.headersArray().filter((header) => header.name.toLowerCase() === 'set-cookie').map((header) => header.value);

  expect(setCookie.some((cookie) => cookie.startsWith('accessToken=;'))).toBe(true);
  expect(setCookie.some((cookie) => cookie.startsWith('refreshToken=;'))).toBe(true);
}

export function expectRedirect(response: APIResponse, location?: RegExp): void {
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);

  if (location) {
    expect(response.headers().location).toMatch(location);
  }
}
