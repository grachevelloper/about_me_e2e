import type { FullConfig } from '@playwright/test';
import { rm } from 'node:fs/promises';

import { cleanupRunData } from '../helpers/db';
import { contextPath, readTestContext, storageDir } from './test-context';

async function globalTeardown(_config: FullConfig): Promise<void> {
  try {
    const context = await readTestContext();
    cleanupRunData(context.runId);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  } finally {
    await rm(contextPath, { force: true });
    await rm(storageDir, { recursive: true, force: true });
  }
}

export default globalTeardown;
