import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { TestUser } from '../data/users';

export interface TestContext {
  runId: string;
  users: Record<TestUser['key'], TestUser & { id: string }>;
}

export const storageDir = path.resolve('storage');
export const contextPath = path.join(storageDir, 'e2e-context.json');

export function storageStatePath(name: string): string {
  return path.join(storageDir, `${name}.json`);
}

export async function ensureAuthDir(): Promise<void> {
  await mkdir(storageDir, { recursive: true });
}

export async function writeTestContext(context: TestContext): Promise<void> {
  await writeFile(contextPath, `${JSON.stringify(context, null, 2)}\n`);
}

export async function readTestContext(): Promise<TestContext> {
  return JSON.parse(await readFile(contextPath, 'utf8')) as TestContext;
}
