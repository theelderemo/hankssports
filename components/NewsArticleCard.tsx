
import React from 'react';
import type { NewsArticle } from '../types';
import { TeamFocus } from '../types';
import { LinkIcon } from './icons/LinkIcon'; // Assuming you have a LinkIcon

interface NewsArticleCardProps {
  article: NewsArticle;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return `${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return dateString; // fallback to original string if parsing fails
  }
};

export const NewsArticleCard: React.FC<NewsArticleCardProps> = ({ article }) => {
  return (
    <article className="bg-slate-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-slate-700">
      <header className="mb-3">
        <h3 className="text-xl font-bold text-sky-400 mb-1 flex items-center flex-wrap">
          {article.title}
          {article.teamTags && article.teamTags.map(tag => (
            <span
              key={tag}
              className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                ${tag === TeamFocus.COLTS ? 'bg-sky-600 text-white' : ''}
                ${tag === TeamFocus.THUNDER ? 'bg-orange-500 text-white' : ''}
                ${tag !== TeamFocus.COLTS && tag !== TeamFocus.THUNDER ? 'bg-slate-600 text-slate-200' : ''}
              `}
            >
              {tag}
            </span>
          ))}
        </h3>
        <div className="text-xs text-slate-400 space-x-2">
          <span>Source: <span className="font-medium text-slate-300">{article.sourceName}</span></span>
          <span>|</span>
          <span>Category: <span className="font-medium text-slate-300">{article.category}</span></span>
          <span>|</span>
          <span>Published: <span className="font-medium text-slate-300">{formatDate(article.publicationDate)}</span></span>
        </div>
      </header>
      <p className="text-slate-300 leading-relaxed mb-4 text-sm">{article.summary}</p>
      <footer>
        {article.articleUrl ? (
          <a
            href={article.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline font-medium text-sm transition-colors"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            Read Full Article
          </a>
        ) : article.groundingLinks && article.groundingLinks.length > 0 ? (
          <div>
            <p className="text-xs text-slate-400 mb-1">Related information sources:</p>
            <ul className="space-y-1">
              {article.groundingLinks.map((link, index) => (
                <li key={index} className="flex items-center">
                   <LinkIcon className="h-3 w-3 mr-1.5 text-sky-500 flex-shrink-0" />
                   <a
                    href={link.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 hover:text-sky-400 hover:underline text-xs truncate"
                    title={link.uri}
                  >
                    {link.title || link.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No direct article link or specific sources provided.</p>
        )}
      </footer>
    </article>
  );
};