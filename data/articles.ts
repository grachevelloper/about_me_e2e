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
