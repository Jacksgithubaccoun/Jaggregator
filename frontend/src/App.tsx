import React from 'react';
import Home from './pages/Home';
import './index.css';

const App: React.FC = () => (
  <div className="bg-white dark:bg-gray-900 min-h-screen text-black dark:text-white">
    <Home />
  </div>
);

export default App;