
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-slate-400 text-center p-6 mt-auto shadow-inner">
      <p className="text-sm">
        © {new Date().getFullYear()} Hank's Sports Central. AI-Powered News Aggregation. Built by Chris.
      </p>
      <p className="text-xs mt-1">
        Information provided is AI-generated and for entertainment purposes. Accuracy may vary. Always consult primary sources for official news.
      </p>
    </footer>
  );
};