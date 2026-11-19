import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

export default function Navbar({ variant = "default" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo to="/" />

        {/* Center Nav Links - Shown on main / landing views */}
        {!isAuthPage && (
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <Link to="/#features" className="hover:text-purple-400 transition-colors">Features</Link>
            <Link to="/#demo" className="hover:text-purple-400 transition-colors">Interactive Demo</Link>
            <Link to="/#how-it-works" className="hover:text-purple-400 transition-colors">How It Works</Link>
            <Link to="/dashboard" className={`hover:text-purple-400 transition-colors ${isDashboard ? 'text-purple-400 font-semibold' : ''}`}>
              Dashboard
            </Link>
          </nav>
        )}

        {/* Auth Action Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {location.pathname !== '/login' && (
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors rounded-lg hover:bg-slate-900"
            >
              Sign In
            </Link>
          )}

          {location.pathname !== '/signup' && (
            <Link
              to="/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              Get Started Free
            </Link>
          )}
        </div>

        {/* Mobile menu trigger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-900 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-4 pb-6 space-y-3">
          <Link
            to="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-purple-400 font-medium py-1.5"
          >
            Features
          </Link>
          <Link
            to="/#demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-purple-400 font-medium py-1.5"
          >
            Interactive Demo
          </Link>
          <Link
            to="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-purple-400 font-medium py-1.5"
          >
            How It Works
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-purple-400 font-medium py-1.5"
          >
            Student Dashboard
          </Link>
          <div className="pt-4 flex flex-col space-y-2 border-t border-slate-800">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-md transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

