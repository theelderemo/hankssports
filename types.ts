
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface NewsArticle {
  id: string; // Add an ID for React keys
  title: string;
  summary: string;
  sourceName: string;
  category: NewsCategory;
  publicationDate: string; // ISO 8601 string
  teamTags: TeamFocus[]; // e.g., ["Colts", "Thunder"]
  articleUrl?: string | null;
  groundingLinks?: GroundingSource[];
}

export enum NewsCategory {
  ALL = "All Categories",
  PERU_IN = "Peru, Indiana Sports",
  KOKOMO_IN = "Kokomo, Indiana Sports",
  INDIANA_STATE = "Indiana State Sports",
  NATIONAL = "National Sports News",
}

export enum TeamFocus {
  ALL = "All Teams",
  COLTS = "Indianapolis Colts",
  THUNDER = "Oklahoma City Thunder",
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  sources?: GroundingSource[];
}

// For Gemini Service
export interface FetchNewsArticlesResponse {
  articles: NewsArticle[];
  sources: GroundingSource[];
}
export interface GenerateContentResponseText {
    text: string;
    sources?: GroundingSource[];
}