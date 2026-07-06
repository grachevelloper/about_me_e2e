import type { FullConfig } from '@playwright/test';

import { waitForApi } from '../helpers/api';
import { cleanupRunData } from '../helpers/db';
import { createRoleUsers } from '../helpers/users-api';

async function globalSetup(_config: FullConfig): Promise<void> {
  const runId = process.env.E2E_RUN_ID ?? `e2e-${Date.now()}`;

  await waitForApi();
  cleanupRunData(runId);
  await createRoleUsers(runId);
}

export default globalSetup;
