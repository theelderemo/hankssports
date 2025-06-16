import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { GenerateContentResponse, Chat, Tool, GenerateContentParameters } from "@google/genai";
import { NewsArticle, GroundingSource, FetchNewsArticlesResponse, GenerateContentResponseText, TeamFocus, NewsCategory } from '../types'; // Changed from import type for enums
import { GEMINI_TEXT_MODEL, NEWS_FETCH_PROMPT, HOURLY_SUMMARY_PROMPT, DEFAULT_NEWS_ARTICLES, DEFAULT_HOURLY_SUMMARY, API_KEY_ERROR_MESSAGE, CHAT_SYSTEM_INSTRUCTION } from '../constants';

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
    // Per Gemini guidelines, if tools: [{googleSearch: {}}] is used,
    // other configs like safetySettings or thinkingConfig should be omitted to avoid potential issues.
    const config: GenerateContentParameters['config'] = {
        tools: [{googleSearch: {}}]
    };

    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: HOURLY_SUMMARY_PROMPT,
      config: config
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
    // Check for specific Gemini API error structure if available
    const errorDetails = (error as any)?.error || (error as any)?.toJSON?.() || error;
    const errorMessage = errorDetails?.message || (error as Error).message || 'Unknown error fetching summary';
    console.error("Detailed error object for hourly summary:", JSON.stringify(errorDetails, null, 2));
    return { text: `${DEFAULT_HOURLY_SUMMARY} (Error: ${errorMessage})`, sources: [] };
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
    // Per Gemini guidelines, if tools: [{googleSearch: {}}] is used,
    // other configs like safetySettings or thinkingConfig should be omitted.
     const config: GenerateContentParameters['config'] = {
        tools: [{googleSearch: {}}]
    };

    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: NEWS_FETCH_PROMPT,
      config: config
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
    systemInstructionText: string, // Renamed for clarity from systemInstruction in constants
    toolsList?: Tool[], // Renamed for clarity
    thinkingConfigSettings?: GenerateContentParameters['config']['thinkingConfig'] // Renamed
    ): Promise<Chat> => {
  const localAi = getAiInstance(); 
  
  const chatConfig: GenerateContentParameters['config'] = {
      systemInstruction: systemInstructionText,
  };

  const usesGoogleSearch = toolsList?.some(tool => tool.googleSearch);

  if (usesGoogleSearch) {
    chatConfig.tools = toolsList;
    // Do NOT add safetySettings or thinkingConfig if googleSearch is active, per guidelines
  } else {
    // Only add these if googleSearch is NOT active
    chatConfig.safetySettings = ALL_SAFETY_SETTINGS_BLOCK_NONE;
    if (thinkingConfigSettings && modelName === "gemini-2.5-flash-preview-04-17") { 
      chatConfig.thinkingConfig = thinkingConfigSettings;
    }
    if(toolsList) { // Add tools if they exist and googleSearch wasn't the reason to add them above
        chatConfig.tools = toolsList;
    }
  }
  
  try {
    const chat: Chat = localAi.chats.create({
      model: modelName,
      config: chatConfig,
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
    // Safety settings and other major configs are part of the chat session initialization.
    // sendMessage typically doesn't re-specify these, but relies on the session's configuration.
    const result: GenerateContentResponse = await chat.sendMessage({ message: messageText });
    
    const sources: GroundingSource[] = result.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || chunk.web?.uri || "Unknown Source"
      }))
      .filter(source => source.uri) || [];
    
    return { text: result.text, sources };
  } catch (error: any)
 {
    console.error("Error sending message to Gemini chat:", error);
    if (error.message && (error.message.includes('[GoogleGenerativeAI Error]: API key not valid') || error.message.includes("API_KEY_INVALID"))) {
         throw new ApiKeyInvalidError(API_KEY_ERROR_MESSAGE);
    }
    throw error; 
  }
};
