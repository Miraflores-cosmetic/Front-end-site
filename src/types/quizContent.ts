export type QuizMediaType = 'image' | 'video' | 'pdf' | 'unknown';

export interface QuizContentItem {
  plain: string | null;
  html: string | null;
  mediaUrl: string | null;
  mediaType: QuizMediaType | null;
}

export type QuizContentMap = Record<string, QuizContentItem>;

export interface QuizContentResponse {
  success: boolean;
  source: 'cms' | 'fallback';
  content: QuizContentMap;
}

export interface ResolvedTextBlock {
  key: string;
  html: string;
  plain: string;
}

export interface ResolvedMediaBlock {
  key: string;
  url: string;
  mediaType: QuizMediaType;
}

export interface ResolvedContentBlock {
  texts: ResolvedTextBlock[];
  media: ResolvedMediaBlock[];
}
