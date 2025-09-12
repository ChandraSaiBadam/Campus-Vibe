import { useEffect, useState } from "react";

/**
 * Custom hook for dark mode with SSR safety and improved localStorage handling.
 * @returns {[boolean, function]} [darkMode, setDarkMode]
 */
export function useDarkMode() {
  const getInitialMode = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('darkMode');
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  };

  const [darkMode, setDarkMode] = useState(getInitialMode);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.document) {
      if (darkMode) {
        window.document.documentElement.classList.add('dark');
      } else {
        window.document.documentElement.classList.remove('dark');
      }
      window.localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }
  }, [darkMode]);

  return [darkMode, setDarkMode];
}
