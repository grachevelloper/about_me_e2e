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

export function cleanupRunData(runId: string): void {
  const pattern = `%${runId}%`;

  runSql(`
    DELETE FROM "likes" WHERE "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "comments" WHERE "content" LIKE ${sqlLiteral(pattern)}
      OR "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "attachments" WHERE "url" LIKE ${sqlLiteral(pattern)}
      OR "s3_key" LIKE ${sqlLiteral(pattern)}
      OR "entity_id" IN (
        SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)}
        UNION SELECT "id" FROM "articles" WHERE "title" LIKE ${sqlLiteral(pattern)}
        UNION SELECT "id" FROM "todos" WHERE "title" LIKE ${sqlLiteral(pattern)}
      );
    DELETE FROM "article_tags" WHERE "articleId" IN (SELECT "id" FROM "articles" WHERE "title" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "articles" WHERE "title" LIKE ${sqlLiteral(pattern)}
      OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "tags" WHERE "name" LIKE ${sqlLiteral(pattern)};
    DELETE FROM "checklists" WHERE "todo_id" IN (SELECT "id" FROM "todos" WHERE "title" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "todos" WHERE "title" LIKE ${sqlLiteral(pattern)}
      OR "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)};
  `);
}
