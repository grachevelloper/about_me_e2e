export interface Todo {
  id: string;
  title: string;
  content: string;
  authorId: string;
  priority: 'Low' | 'Medium' | 'High' | 'Super' | null;
  state: 'Planning' | 'In_work' | 'Finished' | 'Canceled' | null;
  likesCount: number;
  hasLiked: boolean;
}

export type TodoPriority = NonNullable<Todo['priority']>;
export type TodoState = NonNullable<Todo['state']>;

export function validTodo(runId: string, label = 'todo'): Pick<Todo, 'title' | 'content'> & { priority: TodoPriority; state: TodoState } {
  return {
    title: `${runId} ${label} ${Date.now()}`,
    content: `${runId} ${label} content`,
    priority: 'Medium',
    state: 'Planning',
  };
}

export const todoPriorities: TodoPriority[] = ['Low', 'Medium', 'High', 'Super'];
export const todoStates: TodoState[] = ['In_work', 'Planning', 'Finished', 'Canceled'];
