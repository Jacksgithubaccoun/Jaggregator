import React, { useEffect, useState } from 'react';
import { useSourceStore } from '../store/sources';
import { fetchArticles } from '../utils/api';

export const ArticleList = () => {
  const sources = useSourceStore((s) => s.sources);
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const all: any[] = [];
    for (const url of sources) {
      try {
        const { articles: arts } = await fetchArticles(url);
        all.push(...arts);
      } catch {}
    }
    setArticles(all);
    setLoading(false);
  };

  useEffect(() => {
    if (sources.length) {
      fetchAll();
      const iv = setInterval(fetchAll, 1000 * 60 * 5);
      return () => clearInterval(iv);
    }
  }, [sources]);

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(filter.toLowerCase())
  );

  const share = async (a: any) => {
    const text = `${a.title} — ${a.link}`;
    if (navigator.share) return navigator.share({ title: a.title, text, url: a.link });
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard');
  };

  return (
    <div>
      <input
        className="p-2 border rounded w-full mb-4"
        placeholder="Filter…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {loading && <p>Loading…</p>}
      {!loading &&
        filtered.map((a, i) => (
          <div key={i} className="border-b py-2">
            <a
              href={a.link}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 font-semibold"
            >
              {a.title}
            </a>
            <p className="text-sm text-gray-400">
              {a.source} – {new Date(a.pubDate).toLocaleDateString()}
            </p>
            <p>{a.contentSnippet}</p>
            <button
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
              onClick={() => share(a)}
            >
              Share
            </button>
          </div>
        ))}
    </div>
  );
};
