// src/pages/Home.tsx
import React, { useEffect, useState } from 'react';
import FeedsManager from '../components/FeedsManager';
import MatrixRain from '../components/MatrixRain';
import '../matrix-theme.css';

const allTags = ['audio', 'article', 'left wing', 'right wing', 'alternative'];

function AudioPlayer({
  audioUrlMp3,
  audioUrlOgg,
  audioUrlWebm,
  audioUrl,
}: {
  audioUrlMp3?: string | null;
  audioUrlOgg?: string | null;
  audioUrlWebm?: string | null;
  audioUrl?: string | null;
}) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoad = () => {
    setShowPlayer(true);
    setLoading(true);
  };

  return (
    <>
      {!showPlayer ? (
        <button
          onClick={handleLoad}
          style={{
            background: '#444',
            color: '#ccc',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          ▶️ Load Audio
        </button>
      ) : (
        <>
          {loading && <div style={{ color: '#ccc', marginBottom: 8 }}>Loading audio...</div>}
          <audio
            controls
            preload="none"
            style={{ width: '100%' }}
            onCanPlay={() => setLoading(false)}
            onError={() => setLoading(false)}
          >
            {audioUrlMp3 && <source src={audioUrlMp3} type="audio/mpeg" />}
            {audioUrlOgg && <source src={audioUrlOgg} type="audio/ogg; codecs=opus" />}
            {audioUrlWebm && <source src={audioUrlWebm} type="audio/webm" />}
            {audioUrl && !audioUrl.match(/\.(mp3|ogg|webm)$/i) && <source src={audioUrl} />}
            Your browser does not support the audio element.
          </audio>
        </>
      )}
    </>
  );
}

const Home: React.FC = () => {
  const [feeds, setFeeds] = useState<string[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [typedKeys, setTypedKeys] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loadingFullArticle, setLoadingFullArticle] = useState(false);
  const [expandedContent, setExpandedContent] = useState<string>('');

    const clearError = () => setError('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setTypedKeys((prev) => {
        const next = (prev + e.key.toLowerCase()).replace(/[^a-z]/g, '').slice(-30);
        if (next.includes('thepowersthatbe')) {
          setShowSecret(true);
        }
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addFeed = async (url: string): Promise<void> => {
    if (feeds.includes(url)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to fetch feed articles');
      const data = await res.json();

      const newArticles = data.articles.filter(
        (newArticle: any) => !articles.some((a) => a.link === newArticle.link)
      );

      setFeeds((prev) => [...prev, url]);
      setArticles((prev) => [...prev, ...newArticles]);
    } catch {
      setError('Failed to add feed.');
    } finally {
      setLoading(false);
    }
  };

  const removeFeed = async (url: string): Promise<void> => {
    setFeeds((prev) => prev.filter((f) => f !== url));
    setArticles((prev) => prev.filter((a) => a.feedUrl !== url));
    return Promise.resolve();
  };

  useEffect(() => {
    const loadFeeds = async () => {
      try {
        const savedFeeds: string[] = JSON.parse(localStorage.getItem('feeds') || '[]');
        setFeeds(savedFeeds);

        const articlesArrays = await Promise.all(
          savedFeeds.map(async (url) => {
            try {
              const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
              if (!res.ok) return [];
              const data = await res.json();
              return data.articles || [];
            } catch {
              return [];
            }
          })
        );

        const allArticles = articlesArrays.flat();
        const uniqueArticles = allArticles.filter(
          (article, index, self) =>
            index === self.findIndex((a) => a.link === article.link)
        );

        setArticles(uniqueArticles);
      } catch {
        setError('Failed to fetch articles from saved feeds.');
      }
    };

    loadFeeds();
  }, []);

  useEffect(() => {
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }, [feeds]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredArticles = articles.filter((article) => {
    const matchesTags =
      selectedTags.length === 0 ||
      article.tags?.some((tag: string) => selectedTags.includes(tag));
    const matchesSearch =
      article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource =
      !sourceFilter.trim() ||
      article.source?.toLowerCase().includes(sourceFilter.toLowerCase());
    return matchesTags && matchesSearch && matchesSource;
  });

  const filteredArticlesSorted = filteredArticles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  const visibleArticles = filteredArticlesSorted.slice(0, visibleCount);

  useEffect(() => {
    if (!expandedArticle) {
      setExpandedContent('');
      setLoadingFullArticle(false);
      return;
    }

    const selected = articles.find((a) => a.link === expandedArticle);

    if (
      selected?.audioUrl ||
      selected?.audioUrlMp3 ||
      selected?.audioUrlOgg ||
      selected?.audioUrlWebm
    ) {
      setExpandedContent('');
      setLoadingFullArticle(false);
      return;
    }

    const fetchFullArticle = async () => {
      setLoadingFullArticle(true);
      try {
        const res = await fetch(`/api/fetch-full-article?url=${encodeURIComponent(expandedArticle)}`);
        if (!res.ok) throw new Error('Failed to load full article');
        const data = await res.json();
        setExpandedContent(data.content || 'No content available.');
      } catch {
        setExpandedContent('Failed to load full article.');
      } finally {
        setLoadingFullArticle(false);
      }
    };

    fetchFullArticle();
  }, [expandedArticle, articles]);

  return (
    <>
      <MatrixRain />

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 5,
        }}
      />

      <main style={{ ...styles.container, position: 'relative', zIndex: 10 }}>
        <h1 style={styles.title}>Jaggregator</h1>
        
        <FeedsManager
  feeds={feeds}
  addFeed={addFeed}
  removeFeed={removeFeed}
  loading={loading}
  error={error}
  clearError={clearError}        
/>
        <section aria-label="Search articles" style={styles.controlsContainer}>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Filter by source name..."
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ ...styles.input, marginTop: 8 }}
            disabled={loading}
          />
        </section>

        <section aria-label="Filter articles by tag" style={styles.tagsContainer}>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                ...styles.tagButton,
                ...(selectedTags.includes(tag) ? styles.tagButtonActive : {}),
              }}
              aria-pressed={selectedTags.includes(tag)}
              disabled={loading}
            >
              {tag}
            </button>
          ))}
        </section>

        {loading && <p style={styles.statusText}>Loading articles...</p>}
        {!loading && error && (
          <p role="alert" style={{ ...styles.statusText, color: '#f66' }}>{error}</p>
        )}

        <section aria-label="News articles" style={styles.articlesSection}>
          {filteredArticles.length === 0 && !loading && !error && (
            <p style={styles.statusText}>No articles found.</p>
          )}
          <ul style={styles.articleList}>
            {visibleArticles.map((article, idx) => {
              const key = article.link || `article-${idx}`;
              return (
                <li key={key} style={styles.articleItem}>
                  <img
                    src={article.thumbnail || '/images/fallback.png'}
                    alt={`${article.source || 'News'} logo`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/fallback.png';
                    }}
                    style={styles.thumbnail}
                  />
                  <div style={styles.articleContent}>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.articleTitle}
                    >
                      {article.title}
                    </a>
                    <p style={styles.articleDescription}>{article.description}</p>
                    <small style={styles.articleMeta}>
                      {new Date(article.pubDate).toLocaleString()} | {article.source}
                    </small>

                    <button
                      onClick={() =>
                        setExpandedArticle(
                          expandedArticle === article.link ? null : article.link
                        )
                      }
                      style={{
                        marginRight: 10,
                        marginTop: 6,
                        cursor: 'pointer',
                        background: '#444',
                        border: 'none',
                        color: '#eee',
                        padding: '6px 10px',
                        borderRadius: 4,
                      }}
                      aria-expanded={expandedArticle === article.link}
                    >
                      {expandedArticle === article.link ? 'Collapse' : 'Expand'}
                    </button>

                    {expandedArticle === article.link && (article.audioUrl || article.audioUrlMp3 || article.audioUrlOgg || article.audioUrlWebm) && (
  <AudioPlayer
    audioUrl={article.audioUrl}
    audioUrlMp3={article.audioUrlMp3}
    audioUrlOgg={article.audioUrlOgg}
    audioUrlWebm={article.audioUrlWebm}
  />
)}

                    {expandedArticle === article.link &&
                      !loadingFullArticle &&
                      expandedContent &&
                      !(article.audioUrl || article.audioUrlMp3 || article.audioUrlOgg || article.audioUrlWebm) && (
                        <article
                          style={{
                            marginTop: 10,
                            maxHeight: 300,
                            overflowY: 'auto',
                            backgroundColor: '#111',
                            padding: 10,
                            borderRadius: 4,
                            color: '#ccc',
                          }}
                          dangerouslySetInnerHTML={{ __html: expandedContent }}
                        />
                      )}

                    {loadingFullArticle && expandedArticle === article.link && (
                      <p style={{ color: '#ccc', marginTop: 10 }}>Loading full article...</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {visibleCount < filteredArticlesSorted.length && (
            <button
              onClick={() => setVisibleCount((v) => v + 10)}
              style={styles.loadMoreButton}
              disabled={loading}
            >
              Load More
            </button>
          )}
        </section>

        {showSecret && (
          <section
            style={{
              position: 'fixed',
              bottom: 10,
              right: 10,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#0f0',
              padding: 10,
              borderRadius: 6,
              zIndex: 9999,
              maxWidth: 320,
              fontSize: 12,
              fontFamily: 'monospace',
            }}
            aria-live="polite"
          >
            <strong>Secret activated:</strong> The Powers That Be
          </section>
        )}
      </main>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: '20px auto',
    padding: 16,
    color: '#ccc',
  },
  title: {
    fontSize: 32,
    marginBottom: 16,
    textAlign: 'center',
  },
  controlsContainer: {
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: 8,
    background: '#222',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#eee',
  },
  tagsContainer: {
    marginBottom: 16,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagButton: {
    backgroundColor: '#333',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#ccc',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  tagButtonActive: {
    backgroundColor: '#0f0',
    color: '#000',
    fontWeight: 'bold',
  },
  statusText: {
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  articlesSection: {
    marginTop: 16,
  },
  articleList: {
    listStyle: 'none',
    padding: 0,
  },
  articleItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    borderBottom: '1px solid #444',
  },
  thumbnail: {
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 4,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    color: '#0f0',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
  articleDescription: {
    marginTop: 4,
    fontSize: 14,
    color: '#ccc',
  },
  articleMeta: {
    fontSize: 12,
    color: '#888',
  },
  loadMoreButton: {
    marginTop: 12,
    padding: '8px 16px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#0f0',
    color: '#000',
    cursor: 'pointer',
  },
};

export default Home;
