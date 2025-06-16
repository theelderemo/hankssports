
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NewsFeed } from './components/NewsFeed';
import { ChatWidget } from './components/ChatWidget';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { fetchNewsArticles, fetchHourlySummary, initializeGeminiService } from './services/geminiService';
import type { NewsArticle, GroundingSource } from './types';
import { DEFAULT_HOURLY_SUMMARY, DEFAULT_NEWS_ARTICLES, API_KEY_ERROR_MESSAGE, GENERAL_ERROR_MESSAGE } from './constants';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [apiKeyValid, setApiKeyValid] = useState<boolean>(true); 
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  
  const [hourlySummary, setHourlySummary] = useState<string>('');
  const [allNewsArticles, setAllNewsArticles] = useState<NewsArticle[]>([]);
  const [globalGroundingSources, setGlobalGroundingSources] = useState<GroundingSource[]>([]);

  const loadApiKey = useCallback(() => {
    const key = process.env.API_KEY || ""; 
    
    if (!key) {
      console.warn("API_KEY is not set. Features requiring Gemini API will be disabled.");
      setApiKeyValid(false);
      setNewsError(API_KEY_ERROR_MESSAGE);
      setIsNewsLoading(false);
      setHourlySummary("API Key missing. News summary unavailable.");
      setAllNewsArticles([]);
    } else {
      setApiKey(key);
      setApiKeyValid(true); 
      initializeGeminiService(key); 
    }
    return key;
  }, []);


  const loadNewsData = useCallback(async (currentApiKey: string) => {
    if (!currentApiKey || !apiKeyValid) { 
      setIsNewsLoading(false);
      setNewsError(API_KEY_ERROR_MESSAGE);
      setHourlySummary(DEFAULT_HOURLY_SUMMARY); 
      setAllNewsArticles(DEFAULT_NEWS_ARTICLES); 
      return;
    }

    setIsNewsLoading(true);
    setNewsError(null);

    try {
      const [summaryResponse, newsDataResponse] = await Promise.all([
        fetchHourlySummary(),
        fetchNewsArticles()
      ]);
      
      setHourlySummary(summaryResponse.text);
      setAllNewsArticles(newsDataResponse.articles);
      setGlobalGroundingSources(newsDataResponse.sources);

    } catch (error: any) {
      console.error("Failed to load news data:", error);
      if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
        setApiKeyValid(false); 
        setNewsError(API_KEY_ERROR_MESSAGE);
        setHourlySummary(DEFAULT_HOURLY_SUMMARY);
        setAllNewsArticles(DEFAULT_NEWS_ARTICLES);
      } else {
        setNewsError(`${GENERAL_ERROR_MESSAGE}: ${error.message || 'Unknown error'}`);
        setHourlySummary("Error loading summary.");
        setAllNewsArticles([]); 
      }
    } finally {
      setIsNewsLoading(false);
    }
  }, [apiKeyValid]); 

  useEffect(() => {
    const key = loadApiKey();
    if (key && apiKeyValid) { 
       // eslint-disable-next-line @typescript-eslint/no-floating-promises
       loadNewsData(key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [loadApiKey, apiKeyValid]); 


  const handleRefreshNews = () => {
    const currentKey = loadApiKey(); 
    if (currentKey && apiKeyValid) { 
       // eslint-disable-next-line @typescript-eslint/no-floating-promises
       loadNewsData(currentKey);
    } else if (currentKey && !apiKeyValid) { 
        setNewsError(API_KEY_ERROR_MESSAGE);
        setHourlySummary(DEFAULT_HOURLY_SUMMARY);
        setAllNewsArticles(DEFAULT_NEWS_ARTICLES);
        setIsNewsLoading(false);
    } else { 
       setNewsError(API_KEY_ERROR_MESSAGE);
       setIsNewsLoading(false); 
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Header 
        onRefreshNews={handleRefreshNews} 
        isNewsLoading={isNewsLoading} 
        apiKeyValid={apiKeyValid} 
      />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Chat Widget takes full width at the top */}
        <div className="w-full">
          <ChatWidget apiKeyValid={apiKeyValid} apiKey={apiKey} />
        </div>

        {/* News Feed section below chat, also taking full width */}
        <div className="w-full">
          {!apiKeyValid && ( 
            <div className="mb-8 p-4 bg-red-700 text-white rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-2">API Key Error</h2>
              <p>{API_KEY_ERROR_MESSAGE} Features requiring the API (News Feed, Chat) will use placeholder content or show errors.</p>
            </div>
          )}
          {isNewsLoading && apiKeyValid && ( 
            <div className="flex flex-col items-center justify-center h-64 bg-slate-800 rounded-lg p-6 shadow-xl">
              <SpinnerIcon className="h-12 w-12 text-blue-400" />
              <p className="mt-4 text-xl font-semibold text-slate-300">Loading sports news feed...</p>
            </div>
          )}
          {/* Render NewsFeed if not initial loading (spinner shown above) OR if API key is invalid (to show its internal placeholders/errors) */}
          {(!isNewsLoading || !apiKeyValid) && (
            <NewsFeed
              apiKeyValid={apiKeyValid}
              hourlySummary={hourlySummary}
              articles={allNewsArticles} // Pass ALL fetched articles
              globalGroundingSources={globalGroundingSources}
              isLoading={isNewsLoading} // Pass loading state for NewsFeed internal use if any
              error={newsError} 
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
