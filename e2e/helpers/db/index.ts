import { execFileSync } from 'node:child_process';

const dbContainerCandidates = [process.env.E2E_DB_CONTAINER, 'fullstack-db', 'dev-postgres'].filter(Boolean) as string[];
let resolvedContainer: string | undefined;

function dbContainer(): string {
  if (resolvedContainer) {
    return resolvedContainer;
  }

  for (const candidate of dbContainerCandidates) {
    try {
      execFileSync('docker', ['exec', candidate, 'true'], { stdio: 'ignore' });
      resolvedContainer = candidate;
      return candidate;
    } catch {
      // Try the next known compose container name.
    }
  }

  return dbContainerCandidates[0];
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function runSql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', dbContainer(), 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql],
    { encoding: 'utf8' },
  );
}

export function updateUserRole(email: string, role: 'User' | 'Writer' | 'Admin'): void {
  runSql(`UPDATE "users" SET "role" = ${sqlLiteral(role)} WHERE "email" = ${sqlLiteral(email)};`);
}

export function getUserIdByEmail(email: string): string {
  return runSql(`SELECT "id" FROM "users" WHERE "email" = ${sqlLiteral(email)};`).trim();
}

export function moveTodoToPublicOwner(todoId: string): void {
  const publicOwnerId = getUserIdByEmail('gracheveloper@gmail.com');
  runSql(`UPDATE "todos" SET "author_id" = ${sqlLiteral(publicOwnerId)} WHERE "id" = ${sqlLiteral(todoId)};`);
}

function cleanupData(textPattern: string, userEmailPattern: string): void {
  const text = sqlLiteral(textPattern);
  const userEmail = sqlLiteral(userEmailPattern);

  runSql(`
    DELETE FROM "likes" WHERE "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail});
    DELETE FROM "comments" WHERE "content" LIKE ${text}
      OR "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail});
    DELETE FROM "attachments" WHERE "url" LIKE ${text}
      OR "s3_key" LIKE ${text}
      OR "entity_id" IN (
        SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail}
        UNION SELECT "id" FROM "articles" WHERE "title" LIKE ${text}
          OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail})
        UNION SELECT "id" FROM "todos" WHERE "title" LIKE ${text}
          OR "author_id" IN (SELECT "id"::text FROM "users" WHERE "email" LIKE ${userEmail})
      );
    DELETE FROM "article_tags" WHERE "articleId" IN (
      SELECT "id" FROM "articles" WHERE "title" LIKE ${text}
        OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail})
    );
    DELETE FROM "articles" WHERE "title" LIKE ${text}
      OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail});
    DELETE FROM "tags" WHERE "name" LIKE ${text};
    DELETE FROM "checklists" WHERE "todo_id" IN (
      SELECT "id" FROM "todos" WHERE "title" LIKE ${text}
        OR "author_id" IN (SELECT "id"::text FROM "users" WHERE "email" LIKE ${userEmail})
    );
    DELETE FROM "todos" WHERE "title" LIKE ${text}
      OR "author_id" IN (SELECT "id"::text FROM "users" WHERE "email" LIKE ${userEmail});
    DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${userEmail});
    DELETE FROM "users" WHERE "email" LIKE ${userEmail};
  `);
}

export function cleanupRunData(runId: string): void {
  cleanupData(`%${runId}%`, `%${runId}%`);
}

export function cleanupE2eData(): void {
  cleanupData('%e2e-%', '%@e2e.local');
}
