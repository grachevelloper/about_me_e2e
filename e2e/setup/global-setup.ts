import type { FullConfig } from '@playwright/test';

import { waitForAppReady } from '../helpers/api/client';
import { cleanupE2eData, cleanupRunData } from '../helpers/db';
import { createRoleUsers } from '../helpers/api/entities/users-api';

async function globalSetup(_config: FullConfig): Promise<void> {
  const runId = process.env.E2E_RUN_ID ?? `e2e-${Date.now()}`;

  await waitForAppReady();
  cleanupE2eData();
  cleanupRunData(runId);
  await createRoleUsers(runId);
}

export default globalSetup;
