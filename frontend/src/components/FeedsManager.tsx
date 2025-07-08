// src/components/FeedsManager.tsx
import React, { useState } from 'react';

interface Props {
  feeds: string[];
  addFeed: (url: string) => Promise<void>;
  removeFeed: (url: string) => Promise<void>;
  loading: boolean;
  error: string;
  clearError: () => void;
}

const FeedsManager: React.FC<Props> = ({
  feeds,
  addFeed,
  removeFeed,
  loading,
  error,
  clearError,
}) => {
  const [newFeed, setNewFeed] = useState('');

  const handleAddFeed = async () => {
    if (!newFeed.trim()) return;
    try {
      await addFeed(newFeed.trim());
      setNewFeed('');
    } catch {
      // optionally handle error here
    }
  };

  const handleRemoveFeed = async (url: string) => {
    try {
      await removeFeed(url);
    } catch {
      // optionally handle error here
    }
  };

  return (
    <section aria-label="RSS feed manager" style={{ marginBottom: '1rem' }}>
      <h2 style={{ color: '#0f0' }}>Manage RSS Feeds</h2>

      <div style={{ marginBottom: '0.5rem' }}>
        <input
          type="url"
          placeholder="Enter feed URL"
          value={newFeed}
          onChange={(e) => {
            setNewFeed(e.target.value);
            if (error) clearError();
          }}
          style={{ padding: '4px', width: '70%' }}
          disabled={loading}
        />
        <button
          onClick={handleAddFeed}
          disabled={loading || !newFeed.trim()}
          style={{ marginLeft: '6px' }}
        >
          Add Feed
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {feeds.map((feed) => (
          <li key={feed}>
            {feed}{' '}
            <button onClick={() => handleRemoveFeed(feed)} disabled={loading}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FeedsManager;

