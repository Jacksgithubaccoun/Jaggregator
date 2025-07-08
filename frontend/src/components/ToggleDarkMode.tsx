import React from 'react';

export const ToggleDarkMode = () => {
  const toggle = () => document.documentElement.classList.toggle('dark');
  return (
    <button
      onClick={toggle}
      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
    >
      Toggle Mode
    </button>
  );
};
