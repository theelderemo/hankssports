
import React from 'react';
import { RefreshIcon } from './icons/RefreshIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface HeaderProps {
  onRefreshNews: () => void;
  isNewsLoading: boolean;
  apiKeyValid: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefreshNews, isNewsLoading, apiKeyValid }) => {
  return (
    <header className="bg-slate-800 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400">
          Hank's Sports Central
        </h1>
        <button
          onClick={onRefreshNews}
          disabled={isNewsLoading || !apiKeyValid}
          className={`
            px-4 py-2 rounded-lg font-semibold flex items-center transition-all duration-150 ease-in-out
            ${!apiKeyValid 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : isNewsLoading 
                ? 'bg-blue-700 text-sky-200 cursor-wait' 
                : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-2 focus:ring-blue-300 focus:outline-none'
            }
            transform active:scale-95
          `}
          title={!apiKeyValid ? "API Key Invalid - Refresh Disabled" : isNewsLoading ? "Refreshing news..." : "Refresh News"}
        >
          {isNewsLoading ? (
            <>
              <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshIcon className="h-5 w-5 mr-2" />
              Refresh News
            </>
          )}
        </button>
      </div>
    </header>
  );
};