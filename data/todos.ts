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
