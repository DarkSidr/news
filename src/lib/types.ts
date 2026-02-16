export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content?: string;
  source: string;
  language?: string;
  isTranslated?: boolean;
  originalTitle?: string;
  originalContentSnippet?: string;
  originalContent?: string;
}
