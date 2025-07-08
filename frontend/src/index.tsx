// main.tsx (or index.tsx if you prefer)

import React from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './pages/Home';  // Adjust the path if needed

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HomePage />
    </React.StrictMode>
  );
} else {
  console.error('Root element with id "root" not found in HTML.');
}