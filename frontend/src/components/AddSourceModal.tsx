import React, { useState } from 'react';
import { useSourceStore } from '../store/sources';

export const AddSourceModal = () => {
  const [url, setUrl] = useState('');
  const addSource = useSourceStore((s) => s.addSource);

  return (
    <div className="mb-4">
      <input
        className="p-2 border rounded w-2/3"
        placeholder="RSS feed URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => {
          if (url) {
            addSource(url);
            setUrl('');
          }
        }}
      >
        Add Source
      </button>
    </div>
  );
};
