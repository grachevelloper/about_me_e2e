import type { Todo } from '../../../data/todos';
import type { TestContext } from '../../../setup/test-context';
import { API_PREFIX, newApiContext } from '../client';
import { expectOk } from '../../assertions/status';
import type { PaginatedResponse } from '../../assertions/pagination';

export async function createTodo(
  context: TestContext,
  author: keyof TestContext['users'] = 'primaryUser',
  overrides: Partial<Pick<Todo, 'title' | 'content' | 'priority' | 'state'>> = {},
): Promise<Todo> {
  const user = context.users[author];
  const api = await newApiContext({ storageState: user.storageStatePath });

  try {
    const response = await api.post(`${API_PREFIX}/todos`, {
      data: {
        title: overrides.title ?? `${context.runId} todo`,
        content: overrides.content ?? `${context.runId} todo content`,
        priority: overrides.priority ?? 'Medium',
        state: overrides.state ?? 'Planning',
      },
    });
    await expectOk(response);
    return (await response.json()) as Todo;
  } finally {
    await api.dispose();
  }
}

export async function listTodos(): Promise<PaginatedResponse<Todo>> {
  const api = await newApiContext();

  try {
    const response = await api.get(`${API_PREFIX}/todos`);
    await expectOk(response);
    return (await response.json()) as PaginatedResponse<Todo>;
  } finally {
    await api.dispose();
  }
}
