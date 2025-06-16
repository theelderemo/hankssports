
import React, { useState, useMemo, useEffect } from 'react';
import { NewsArticle, GroundingSource, NewsCategory, TeamFocus } from '../types';
import { NewsArticleCard } from './NewsArticleCard';
import { NEWS_FILTER_CATEGORIES, NEWS_FILTER_TEAMS, DEFAULT_NEWS_ARTICLES, INITIAL_ARTICLES_DISPLAY_COUNT, ARTICLES_PER_LOAD } from '../constants';
import { LinkIcon } from './icons/LinkIcon';
import { HourlySummarySkeleton } from './skeletons/HourlySummarySkeleton';
import { NewsArticleCardSkeleton } from './skeletons/NewsArticleCardSkeleton';

interface NewsFeedProps {
  apiKeyValid: boolean;
  hourlySummary: string;
  articles: NewsArticle[]; 
  globalGroundingSources: GroundingSource[];
  isLoading: boolean; 
  error: string | null;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ apiKeyValid, hourlySummary, articles, globalGroundingSources, isLoading, error }) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<NewsCategory>(NewsCategory.ALL);
  const [activeTeamFilter, setActiveTeamFilter] = useState<TeamFocus>(TeamFocus.ALL);
  const [displayedCount, setDisplayedCount] = useState<number>(INITIAL_ARTICLES_DISPLAY_COUNT);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const categoryMatch = activeCategoryFilter === NewsCategory.ALL || article.category === activeCategoryFilter;
      const teamMatch = activeTeamFilter === TeamFocus.ALL || (article.teamTags && article.teamTags.includes(activeTeamFilter));
      return categoryMatch && teamMatch;
    });
  }, [articles, activeCategoryFilter, activeTeamFilter]);

  useEffect(() => {
    setDisplayedCount(INITIAL_ARTICLES_DISPLAY_COUNT);
  }, [activeCategoryFilter, activeTeamFilter]);

  const articlesToDisplay = useMemo(() => {
    return filteredArticles.slice(0, displayedCount);
  }, [filteredArticles, displayedCount]);
  
  const handleLoadMore = () => {
    setDisplayedCount(prevCount => Math.min(prevCount + ARTICLES_PER_LOAD, filteredArticles.length));
  };

  //Skeleton Loader display
  if (isLoading && apiKeyValid) { // isLoading is true when App.tsx is fetching and API key is good
    return (
      <div className="space-y-8 animate-pulse">
        <HourlySummarySkeleton />
        {/* Skeleton for Filter Section */}
        <section className="bg-slate-800 p-6 rounded-lg shadow-xl">
          <div className="mb-6">
            <div className="h-6 w-1/3 bg-slate-700 rounded mb-3"></div> {/* Filter title placeholder */}
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 w-24 bg-slate-700 rounded-md"></div>)}
            </div>
          </div>
          <div>
            <div className="h-6 w-1/3 bg-slate-700 rounded mb-3"></div> {/* Filter title placeholder */}
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 w-24 bg-slate-700 rounded-md"></div>)}
            </div>
          </div>
        </section>
        {/* Skeleton for News Articles */}
        <section>
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => <NewsArticleCardSkeleton key={index} />)}
          </div>
        </section>
         {/* Skeleton for Grounding Sources (optional, can be simpler) */}
        <section className="bg-slate-800 p-6 rounded-lg shadow-xl">
            <div className="h-7 w-1/2 bg-slate-700 rounded mb-3"></div> {/* Title placeholder */}
            <div className="h-4 w-full bg-slate-700 rounded mb-4"></div> {/* Description placeholder */}
            <div className="space-y-2">
                {[...Array(2)].map((_, i) => <div key={i} className="h-5 w-3/4 bg-slate-700 rounded"></div>)}
            </div>
        </section>
      </div>
    );
  }

  // Error display (if not loading and API key is valid but there's an error)
  if (error && apiKeyValid) { // Removed !isLoading as it's covered by the above skeleton block
    return (
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading News</h2>
        <p className="text-slate-300">{error}</p>
        <p className="text-sm text-slate-400 mt-2">Try refreshing. If the problem persists, please check the console or contact support.</p>
      </div>
    );
  }
  // Note: API Key error message is handled by a banner in App.tsx. 
  // NewsFeed will show default/placeholder content if apiKeyValid is false.

  return (
    <div className="space-y-8">
      {/* Hourly News Roundup */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl shadow-2xl border border-slate-600">
        <h2 className="text-2xl font-bold text-sky-400 mb-3">This Hour's Sports Roundup</h2>
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {apiKeyValid ? hourlySummary : "Hourly summary is unavailable. Please check API Key configuration."}
        </p>
      </section>

      {/* News Filtering System */}
      <section className="bg-slate-800 p-6 rounded-lg shadow-xl">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-3">Filter by Category:</h3>
          <div className="flex flex-wrap gap-2">
            {NEWS_FILTER_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategoryFilter(category)}
                disabled={!apiKeyValid && articles === DEFAULT_NEWS_ARTICLES}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150
                  ${activeCategoryFilter === category ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}
                  ${(!apiKeyValid && articles === DEFAULT_NEWS_ARTICLES) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-3">Filter by Team Focus:</h3>
          <div className="flex flex-wrap gap-2">
            {NEWS_FILTER_TEAMS.map(team => (
              <button
                key={team}
                onClick={() => setActiveTeamFilter(team)}
                disabled={!apiKeyValid && articles === DEFAULT_NEWS_ARTICLES}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150
                  ${activeTeamFilter === team ? (team === TeamFocus.COLTS ? 'bg-sky-600 text-white' : team === TeamFocus.THUNDER ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}
                  ${(!apiKeyValid && articles === DEFAULT_NEWS_ARTICLES) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* News Timeline */}
      <section>
        {articlesToDisplay.length > 0 ? (
          <div className="space-y-6">
            {articlesToDisplay.map(article => (
              <NewsArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl text-center">
            <p className="text-slate-300 text-lg">
              {/* Logic for empty states, considering API validity and filters */}
              {!apiKeyValid && articles === DEFAULT_NEWS_ARTICLES ? "News feed is showing placeholder content due to an API Key issue. Filters are disabled." :
               apiKeyValid && articles.length === 0 && !error ? "No news articles to display at the moment from the source." :
               apiKeyValid && filteredArticles.length === 0 && articles.length > 0 && !error ? "No news articles match your current filters." :
               "No news articles to show. Try changing filters or refreshing." 
              }
            </p>
          </div>
        )}
        {/* Load More Button: Show if API key is valid, and there are more filtered articles to display */}
        {apiKeyValid && filteredArticles.length > displayedCount && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              Load More News ({filteredArticles.length - displayedCount} more)
            </button>
          </div>
        )}
      </section>

      {/* Information Sourcing Display */}
      {apiKeyValid && globalGroundingSources && globalGroundingSources.length > 0 && (
        <section className="bg-slate-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-slate-300 mb-3">Retrieved Information Sources</h3>
          <p className="text-sm text-slate-400 mb-4">
            The AI may have consulted these general web sources when generating the news content. Individual articles might list more specific sources.
          </p>
          <ul className="space-y-2">
            {globalGroundingSources.map((source, index) => (
              <li key={index} className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-2 text-sky-400 flex-shrink-0" />
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 hover:underline truncate"
                  title={source.uri}
                >
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
