
import React, { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Sun, Moon } from "lucide-react";

const Navbar = ({ darkMode, setDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navigation = useMemo(() => [
    { name: "Home", href: "/" },
    { name: "GPA Calculator", href: "/gpa" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Faculty Reviews", href: "/reviews" },
    { name: "Q&A Forum", href: "/forum" },
    { name: "FFCS Timetable", href: "/timetable" },
  ], []);

  const isActive = useCallback((path) => location.pathname === path, [location.pathname]);

  return (
    <nav className="bg-white/80 dark:bg-dark-bg-900/80 backdrop-blur-md shadow-lg border-b border-white/20 dark:border-dark-bg-700/50 sticky top-0 z-50 transition-all duration-300 animate-slide-in-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent transition-all duration-200 group-hover:scale-105">
                Campus Connect
              </span>
            </Link>
          </div>
          {/* Desktop navigation */}
          <div className="flex items-center w-full">
            <div className="hidden md:flex items-center space-x-8 flex-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-primary-100 text-primary-700 dark:bg-dark-bg-700 dark:text-dark-primary-400"
                      : "text-gray-600 hover:text-primary-600 hover:bg-gray-50 dark:text-dark-text-secondary dark:hover:text-dark-primary-400 dark:hover:bg-dark-bg-600"
                  }`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center ml-auto">
              {/* Dark mode toggle button at far right */}
              <button
                aria-label="Toggle dark mode"
                onClick={() => setDarkMode((d) => !d)}
                className="ml-4 p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-bg-700 dark:to-dark-bg-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-dark-bg-600 dark:hover:to-dark-bg-700 text-indigo-600 dark:text-yellow-400 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-110"
              >
                {darkMode ? <Moon className="w-5 h-5 animate-pulse" /> : <Sun className="w-5 h-5 animate-spin" />}
              </button>
            </div>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-50 dark:text-dark-primary-400 dark:hover:text-dark-primary-400 dark:hover:bg-dark-bg-600 transition-colors duration-200"
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
            >
              <span className="block w-6 h-0.5 bg-gray-600 mb-1 dark:bg-dark-primary-400"></span>
              <span className="block w-6 h-0.5 bg-gray-600 mb-1 dark:bg-dark-primary-400"></span>
              <span className="block w-6 h-0.5 bg-gray-600 dark:bg-dark-primary-400"></span>
            </button>
          </div>
        </div>
        {/* Mobile navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-dark-bg-900 border-t border-gray-200 dark:border-dark-bg-700 transition-colors duration-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-primary-100 text-primary-700 dark:bg-dark-bg-700 dark:text-dark-primary-400"
                      : "text-gray-600 hover:text-primary-600 hover:bg-gray-50 dark:text-dark-text-secondary dark:hover:text-dark-primary-400 dark:hover:bg-dark-bg-600"
                  }`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
