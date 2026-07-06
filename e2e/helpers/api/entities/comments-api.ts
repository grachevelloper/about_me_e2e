import type { TestContext } from '../../../setup/test-context';
import { API_PREFIX, expectOk, newApiContext } from '..';

export type EntityCommentType = 'article' | 'todo';

export interface CommentResponse {
  id: string;
  content: string;
  entityType: EntityCommentType;
  entityId: string;
  parentId: string | null;
  depth: number;
  likesCount: number;
  hasLiked: boolean;
}

export async function createComment(
  context: TestContext,
  entityType: EntityCommentType,
  entityId: string,
  author: keyof TestContext['users'] = 'userA',
  parentId?: string,
): Promise<CommentResponse> {
  const user = context.users[author];
  const api = await newApiContext({ storageState: user.storageStatePath });

  try {
    const response = await api.post(`${API_PREFIX}/comments`, {
      data: {
        content: `${context.runId} comment ${Date.now()}`,
        entityType,
        entityId,
        parentId,
      },
    });
    await expectOk(response);
    return (await response.json()) as CommentResponse;
  } finally {
    await api.dispose();
  }
}
