import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ className = "w-9 h-9", showText = true, to = "/" }) {
  const content = (
    <div className="flex items-center gap-3 select-none group">
      <div className={`relative ${className} flex items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[2px] shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5 text-purple-400 group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 3L27 9.5V22.5L16 29L5 22.5V9.5L16 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 opacity-60" />
            <path d="M16 11V21" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M11 13.5L21 18.5" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M21 13.5L11 18.5" stroke="#818CF8" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.5" fill="#FFFFFF" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent pointer-events-none" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-wider text-white">
            INTERVIX<span className="text-purple-400 ml-1.5 font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

