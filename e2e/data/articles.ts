export interface Article {
  id: string;
  title: string;
  content: string;
  image: string;
  readTime: number | null;
  likesCount: number;
  isDraft: boolean;
  hasLiked: boolean;
}

export function validArticle(runId: string, label = 'article'): Pick<Article, 'title' | 'content' | 'readTime'> {
  return {
    title: `${runId} ${label} ${Date.now()}`,
    content: `${runId} ${label} content`,
    readTime: 3,
  };
}
