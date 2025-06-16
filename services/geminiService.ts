import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { GenerateContentResponse, Chat, Tool, GenerateContentParameters } from "@google/genai";
import { NewsArticle, GroundingSource, FetchNewsArticlesResponse, GenerateContentResponseText, TeamFocus, NewsCategory } from '../types'; // Changed from import type for enums
import { GEMINI_TEXT_MODEL, NEWS_FETCH_PROMPT, HOURLY_SUMMARY_PROMPT, DEFAULT_NEWS_ARTICLES, DEFAULT_HOURLY_SUMMARY, API_KEY_ERROR_MESSAGE } from '../constants';

let ai: GoogleGenAI | null = null;
let currentApiKeyService: string | null = null; 

export class ApiKeyInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyInvalidError";
  }
}

const ALL_SAFETY_SETTINGS_BLOCK_NONE = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const initializeGeminiService = (apiKey: string) => {
  if (!apiKey) {
    console.error("Gemini Service: API Key is required for initialization.");
    ai = null;
    currentApiKeyService = null;
    return;
  }
  if (ai && currentApiKeyService === apiKey) { 
    return;
  }
  try {
    ai = new GoogleGenAI({ apiKey });
    currentApiKeyService = apiKey;
    console.log("Gemini Service Initialized");
  } catch (error: any) {
    console.error("Gemini Service: Failed to initialize GoogleGenAI instance.", error);
    ai = null;
    currentApiKeyService = null;
  }
};

const getAiInstance = (): GoogleGenAI => {
  if (!ai) {
    const apiKeyFromEnv = process.env.API_KEY;
    if (apiKeyFromEnv && (apiKeyFromEnv !== currentApiKeyService || !ai) ) {
        console.log("Gemini Service: Attempting re-initialization from process.env.API_KEY");
        initializeGeminiService(apiKeyFromEnv);
    }
    if (!ai) {
      throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
  }
  return ai;
};


const parseJsonFromString = <T,>(jsonString: string): T | null => {
  let cleanJsonString = jsonString.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanJsonString.match(fenceRegex);
  if (match && match[1]) {
    cleanJsonString = match[1].trim();
  }
  try {
    return JSON.parse(cleanJsonString) as T;
  } catch (error) {
    console.error("Failed to parse JSON string:", error, "Original string for parsing:", jsonString);
    return null;
  }
};

export const fetchHourlySummary = async (): Promise<GenerateContentResponseText> => {
  let localAi: GoogleGenAI;
  try {
    localAi = getAiInstance();
  } catch (error) {
    console.error("Error getting AI instance for hourly summary:", error);
    return { text: `${DEFAULT_HOURLY_SUMMARY} (Error: API Key issue - ${error instanceof Error ? error.message : 'Unknown API key error'})`, sources: [] };
  }

  try {
    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: HOURLY_SUMMARY_PROMPT,
      config: {
        tools: [{googleSearch: {}}],
        safetySettings: ALL_SAFETY_SETTINGS_BLOCK_NONE
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => ({
            uri: chunk.web?.uri || "",
            title: chunk.web?.title || chunk.web?.uri || "Unknown Source"
        }))
        .filter(source => source.uri) || [];
    
    return { text: response.text, sources };

  } catch (error: any) {
    console.error("Error fetching hourly summary from Gemini:", error);
    if (error.message && (error.message.includes('[GoogleGenerativeAI Error]: API key not valid') || error.message.includes("API_KEY_INVALID"))) {
         throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
    return { text: `${DEFAULT_HOURLY_SUMMARY} (Error: ${error.message || 'Unknown error fetching summary'})`, sources: [] };
  }
};

export const fetchNewsArticles = async (): Promise<FetchNewsArticlesResponse> => {
  let localAi: GoogleGenAI;
   try {
    localAi = getAiInstance();
  } catch (error) {
    console.error("Error getting AI instance for news articles:", error);
    return { articles: DEFAULT_NEWS_ARTICLES, sources: [] }; 
  }

  try {
    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: NEWS_FETCH_PROMPT,
      config: {
        tools: [{googleSearch: {}}],
        safetySettings: ALL_SAFETY_SETTINGS_BLOCK_NONE
      }
    });

    const parsedArticles = parseJsonFromString<any[]>(response.text);
    
    if (!parsedArticles || !Array.isArray(parsedArticles)) {
      console.error("Failed to parse news articles or result is not an array. Raw AI response text:", response.text);
      throw new Error("Could not parse news articles from AI response. The format might be incorrect.");
    }
    
    const articles: NewsArticle[] = parsedArticles.map((item: any, index: number) => ({
      id: item.id || `article-${Date.now()}-${index}`,
      title: item.title || "Untitled Article",
      summary: item.summary || "No summary available.",
      sourceName: item.sourceName || "Unknown Source",
      category: Object.values(NewsCategory).includes(item.category as NewsCategory) ? item.category as NewsCategory : NewsCategory.NATIONAL,
      publicationDate: item.publicationDate || new Date().toISOString(),
      teamTags: Array.isArray(item.teamTags) ? item.teamTags.filter((tag: any) => Object.values(TeamFocus).includes(tag as TeamFocus)) as TeamFocus[] : [],
      articleUrl: item.articleUrl || null,
      groundingLinks: Array.isArray(item.groundingLinks) ? item.groundingLinks.filter( (gl: any) => gl.uri && gl.title) : [],
    }));

    const globalSources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => ({
            uri: chunk.web?.uri || "",
            title: chunk.web?.title || chunk.web?.uri || "Unknown Source"
        }))
        .filter(source => source.uri) || [];

    return { articles, sources: globalSources };

  } catch (error: any) {
    console.error("Error fetching news articles from Gemini:", error);
    if (error.message && (error.message.includes('[GoogleGenerativeAI Error]: API key not valid') || error.message.includes("API_KEY_INVALID"))) {
         throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
    return { articles: DEFAULT_NEWS_ARTICLES, sources: [] };
  }
};


export const initializeChatSession = async (
    modelName: string, 
    systemInstruction: string,
    tools?: Tool[],
    thinkingConfig?: GenerateContentParameters['config']['thinkingConfig']
    ): Promise<Chat> => {
  const localAi = getAiInstance(); 
  
  const config: GenerateContentParameters['config'] = {
      systemInstruction,
      safetySettings: ALL_SAFETY_SETTINGS_BLOCK_NONE
  };
  if (tools) config.tools = tools;
  if (thinkingConfig && modelName === "gemini-2.5-flash-preview-04-17") { 
    config.thinkingConfig = thinkingConfig;
  }
  
  try {
    const chat: Chat = localAi.chats.create({
      model: modelName,
      config: config,
    });
    return chat;
  } catch (error: any) {
    console.error("Error initializing chat session with Gemini:", error);
    if (error.message && (error.message.includes('[GoogleGenerativeAI Error]: API key not valid') || error.message.includes("API_KEY_INVALID"))) {
         throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
    throw error; 
  }
};


export const sendMessageToChatSdk = async (chat: Chat, messageText: string): Promise<GenerateContentResponseText> => {
  if (!chat) {
    throw new Error("Chat session not initialized. Cannot send message.");
  }

  try {
    // Note: safetySettings for chat are typically set at session initialization.
    // If they could be overridden per message, it would be in chat.sendMessage options.
    // However, the common practice is session-level for chat.
    const result: GenerateContentResponse = await chat.sendMessage({ message: messageText });
    
    const sources: GroundingSource[] = result.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || chunk.web?.uri || "Unknown Source"
      }))
      .filter(source => source.uri) || [];
    
    return { text: result.text, sources };
  } catch (error: any) {
    console.error("Error sending message to Gemini chat:", error);
    if (error.message && (error.message.includes('[GoogleGenerativeAI Error]: API key not valid') || error.message.includes("API_KEY_INVALID"))) {
         throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
    throw error; 
  }
};
