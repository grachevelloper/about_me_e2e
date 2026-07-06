import { execFileSync } from 'node:child_process';

const defaultContainer = process.env.E2E_DB_CONTAINER ?? 'fullstack-db';

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function runSql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', defaultContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql],
    { encoding: 'utf8' },
  );
}

export function updateUserRole(email: string, role: 'User' | 'Writer' | 'Admin'): void {
  runSql(`UPDATE "users" SET "role" = ${sqlLiteral(role)} WHERE "email" = ${sqlLiteral(email)};`);
}

export function cleanupRunData(runId: string): void {
  const pattern = `%${runId}%`;

  runSql(`
    DELETE FROM "likes" WHERE "userId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "comments" WHERE "content" LIKE ${sqlLiteral(pattern)}
      OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "article_tags" WHERE "articleId" IN (SELECT "id" FROM "articles" WHERE "title" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "articles" WHERE "title" LIKE ${sqlLiteral(pattern)}
      OR "authorId" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "checklists" WHERE "todo_id" IN (SELECT "id" FROM "todos" WHERE "title" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "todos" WHERE "title" LIKE ${sqlLiteral(pattern)}
      OR "author_id" IN (SELECT "id" FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)});
    DELETE FROM "users" WHERE "email" LIKE ${sqlLiteral(pattern)};
  `);
}
