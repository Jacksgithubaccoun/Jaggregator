import React, { useEffect, useState } from 'react';
import { useSourceStore } from '../store/sources';
import { fetchArticles } from '../utils/api';

export const ArticleList = () => {
  const sources = useSourceStore((s) => s.sources);
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Track expanded articles by link
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});
  // Store loaded full content for articles by link
  const [loadedContent, setLoadedContent] = useState<Record<string, string>>({});
  // Loading state for individual articles
  const [loadingArticle, setLoadingArticle] = useState<string | null>(null);

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

  const toggleArticle = async (article: any) => {
    const isExpanded = expandedArticles[article.link];

    if (isExpanded) {
      // Collapse article
      setExpandedArticles((prev) => ({ ...prev, [article.link]: false }));
      return;
    }

    // Expand article
    // For audio articles, no need to fetch content, transcript is assumed included
    if (article.audioUrl) {
      setExpandedArticles((prev) => ({ ...prev, [article.link]: true }));
      return;
    }

    // For non-audio articles, fetch full content if not loaded yet
    if (!loadedContent[article.link]) {
      try {
        setLoadingArticle(article.link);
        const res = await fetch(`/api/fetch-full-article?url=${encodeURIComponent(article.link)}`);
        if (!res.ok) throw new Error('Failed to load article');
        const data = await res.json();
        setLoadedContent((prev) => ({ ...prev, [article.link]: data.content }));
      } catch (error) {
        setLoadedContent((prev) => ({ ...prev, [article.link]: '<p>Failed to load content.</p>' }));
      } finally {
        setLoadingArticle(null);
      }
    }
    setExpandedArticles((prev) => ({ ...prev, [article.link]: true }));
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
        filtered.map((a, i) => {
          const isExpanded = !!expandedArticles[a.link];
          const isLoading = loadingArticle === a.link;

          return (
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
              <p>{a.description || a.contentSnippet}</p>

              <button
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => toggleArticle(a)}
                disabled={isLoading}
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>

              {isLoading && <p>Loading content...</p>}

              {isExpanded && !isLoading && (
                <section className="mt-2">
                  {a.audioUrl ? (
                    <>
                      <audio controls src={a.audioUrl} style={{ width: '100%' }} />
                      {a.transcript && (
                        <div className="mt-4 whitespace-pre-wrap">
                          <h4 className="font-semibold">Transcript</h4>
                          <p>{a.transcript}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{ __html: loadedContent[a.link] || '<p>No content available.</p>' }}
                    />
                  )}
                </section>
              )}

              <button
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => share(a)}
              >
                Share
              </button>
            </div>
          );
        })}
    </div>
  );
};
