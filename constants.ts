
import type { NewsArticle } from './types';
import { NewsCategory, TeamFocus } from './types';

export const GEMINI_CHAT_MODEL = "gemini-2.5-flash-preview-04-17";
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";

export const API_KEY_ERROR_MESSAGE = "API Key is missing or invalid. Please ensure it's correctly configured in your environment (e.g., process.env.API_KEY).";
export const GENERAL_ERROR_MESSAGE = "An error occurred";

export const CHAT_SYSTEM_INSTRUCTION = `You are Hank's Sports Assistant. Address the user as "Hank." 
You have a fun, Gen Z personality, kinda sassy, and you use modern slang.
You are OBSESSED with the Indianapolis Colts and Oklahoma City Thunder. Prioritize news about them and show strong bias.
Keep responses short, witty, and humorous. You can cover local (Peru, Kokomo), Indiana state, and national sports.
Downplay or make sarcastic remarks about other teams, especially rivals of Colts or Thunder.
If you use Google Search for information, list the source URIs. Format them clearly.
If Hank asks for something not sports related, playfully steer him back to sports.`;

export const NEWS_FILTER_CATEGORIES: NewsCategory[] = [
  NewsCategory.ALL,
  NewsCategory.PERU_IN,
  NewsCategory.KOKOMO_IN,
  NewsCategory.INDIANA_STATE,
  NewsCategory.NATIONAL,
];

export const NEWS_FILTER_TEAMS: TeamFocus[] = [
  TeamFocus.ALL,
  TeamFocus.COLTS,
  TeamFocus.THUNDER,
];

export const DEFAULT_HOURLY_SUMMARY = "This Hour's Sports Roundup will appear here once the news is loaded. If you see this for long, check the API key.";

export const DEFAULT_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'placeholder-1',
    title: "News Feed Loading or API Key Issue",
    summary: "Hank, my dude, either the sports news is still cookin' or there's an issue with the API key. If this message stays, tell Chris to check the console. We need our Colts and Thunder fix, like, rn!",
    sourceName: "Hank's Brain",
    category: NewsCategory.NATIONAL,
    publicationDate: new Date().toISOString(),
    teamTags: [TeamFocus.COLTS, TeamFocus.THUNDER],
    articleUrl: null,
    groundingLinks: [{ uri: "#", title: "Debug Console" }]
  }
];

export const NEWS_FETCH_PROMPT = `
Generate a JSON array of 30 diverse sports news articles from the last 24 hours.
Each article object in the array must follow this exact structure:
{
  "title": "string", // Compelling headline
  "summary": "string", // 1-2 sentence AI-generated summary, witty and engaging for a Gen Z audience
  "sourceName": "string", // e.g., "ESPN", "The Athletic", "Local News Kokomo Chronicle"
  "category": "string", // Must be one of: "Peru, Indiana Sports", "Kokomo, Indiana Sports", "Indiana State Sports", "National Sports News"
  "publicationDate": "string", // ISO 8601 format (e.g., "YYYY-MM-DDTHH:mm:ssZ")
  "teamTags": ["string"], // Array. Include "Indianapolis Colts" or "Oklahoma City Thunder" if relevant. Prioritize these teams. Can be empty.
  "articleUrl": "string | null", // Direct URL to the full article if available, else null.
  "groundingLinks": [{ "uri": "string", "title": "string" }] // If articleUrl is null AND you used web search for this specific article, list 1-2 specific source links used for this article's info. Empty if articleUrl exists or no specific search for this item.
}

CRITICAL: Prioritize news about the Indianapolis Colts and Oklahoma City Thunder. Make their news sound epic.
Include a mix of local (Peru/Kokomo, IN), Indiana state, and national sports. Be creative with local team names if needed.
Ensure publication dates are recent and varied within the last 24 hours.
The output MUST be a valid JSON array of these objects. Do not include any text outside the JSON array.
`;

export const HOURLY_SUMMARY_PROMPT = `You are Hank's Sports Assistant, a Gen Z sports fanatic OBSESSED with the Indianapolis Colts and Oklahoma City Thunder.
Generate a 1-2 paragraph, super witty, and engaging sports roundup for "This Hour's Sports Roundup".
Use Gen Z slang (e.g., "no cap", "fire", "bet", "slay", "low key", "high key").
Heavily bias towards Colts and Thunder news. Make them sound like legends.
If there's news about their rivals, throw some shade (e.g., "Patriots LMAO", "Lakers who?").
Keep it concise and punchy. This is for Hank, he's got a short attention span.
Example of tone: "Alright Hank, bet. So, this hour, the Colts are basically confirmed to be the GOATs, no cap. And OKC? They're straight fire, about to dominate. Other teams? Mid at best. LOL."
`;

export const INITIAL_ARTICLES_DISPLAY_COUNT = 10;
export const ARTICLES_PER_LOAD = 10;
