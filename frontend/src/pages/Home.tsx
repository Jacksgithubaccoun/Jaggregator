// src/pages/Home.tsx
import React, { useEffect, useState } from 'react';
import FeedsManager from '../components/FeedsManager';
import MatrixRain from '../components/MatrixRain';
import '../matrix-theme.css';

const allTags = ['audio', 'article', 'left wing', 'right wing', 'alternative'];

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

  // Secret trigger state
  const [typedKeys, setTypedKeys] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Full article reader state
  const [loadingFullArticle, setLoadingFullArticle] = useState(false);
  const [expandedContent, setExpandedContent] = useState<string>('');

  // Secret phrase listener
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
      setFeeds((prev) => [...prev, url]);
      setArticles((prev) => [...prev, ...data.articles]);
    } catch (err) {
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

  const clearError = () => setError('');

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
        setArticles(articlesArrays.flat());
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

  const filteredArticles = Array.isArray(articles)
    ? articles.filter((article) => {
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
      })
    : [];

  const filteredArticlesSorted = filteredArticles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  const visibleArticles = filteredArticlesSorted.slice(0, visibleCount);

  // Load full article content when expandedArticle changes
  useEffect(() => {
    if (!expandedArticle) {
      setExpandedContent('');
      setLoadingFullArticle(false);
      return;
    }

    // Find the selected article
    const selected = articles.find((a) => a.link === expandedArticle);

    // If it has audioUrl, no need to fetch full article, just clear content since audio controls will show
    if (selected?.audioUrl) {
      setExpandedContent(''); // no HTML content needed, audio player will render
      setLoadingFullArticle(false);
      return;
    }

    const fetchFullArticle = async () => {
      setLoadingFullArticle(true);
      try {
        const res = await fetch(`./api/fetch-full-article?url=${encodeURIComponent(expandedArticle)}`);
        if (!res.ok) throw new Error('Failed to load full article');
        const data = await res.json();
        setExpandedContent(data.content || 'No content available.');
      } catch (err) {
        console.error(err);
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
      <main
        style={{
          ...styles.container,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          borderRadius: 12,
          padding: 30,
          position: 'relative',
          zIndex: 1,
        }}
      >
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
          <p role="alert" style={{ ...styles.statusText, color: '#f66' }}>
            {error}
          </p>
        )}

        <section aria-label="News articles" style={styles.articlesSection}>
          {filteredArticles.length === 0 && !loading && !error && (
            <p style={styles.statusText}>No articles found.</p>
          )}
          <ul style={styles.articleList}>
            {visibleArticles.map((article) => (
              <li key={article.link} style={styles.articleItem}>
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

                  {/* Audio player inside article (if present, outside expanded) */}
                  {article.audioUrl && !expandedArticle && (
                    <audio controls style={{ width: '100%', marginTop: 10 }}>
                      <source src={article.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}

                  {/* Read here button */}
                  <button
                    onClick={() => {
                      if (expandedArticle === article.link) {
                        setExpandedArticle(null);
                      } else {
                        setExpandedArticle(article.link);
                      }
                    }}
                    style={{
                      marginRight: 10,
                      border: '1px solid #0f0',
                      backgroundColor: 'transparent',
                      color: '#0f0',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    {expandedArticle === article.link ? 'Hide' : 'Read here'}
                  </button>

                  {/* Visit source button */}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      border: '1px solid #0070f3',
                      color: '#0070f3',
                      padding: '5px 10px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 14,
                    }}
                  >
                    Visit source
                  </a>

                  {/* Expanded Reader */}
                  {expandedArticle === article.link && (
                    <div
                      style={{
                        marginTop: 20,
                        backgroundColor: '#111',
                        padding: 15,
                        borderRadius: 8,
                        border: '1px solid #333',
                        maxWidth: '100%',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        overflowX: 'auto',
                      }}
                    >
                      {article.audioUrl ? (
                        <audio controls style={{ width: '100%' }} key={article.audioUrl}>
                          <source src={article.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      ) : loadingFullArticle ? (
                        <p>Loading full article...</p>
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{ __html: expandedContent }}
                        />
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div style={styles.articleTags}>
                    {article.tags?.map((tag: string) => (
                      <span key={tag} style={styles.articleTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Show more button */}
          {visibleCount < filteredArticles.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              style={{
                marginTop: 20,
                padding: '10px 20px',
                fontSize: 16,
                cursor: 'pointer',
                borderRadius: 8,
                border: '1px solid #0f0',
                backgroundColor: 'transparent',
                color: '#0f0',
              }}
              aria-label="Show more articles"
            >
              Show more
            </button>
          )}
        </section>

        {/* Secret content */}
        {showSecret && (
          <section
            aria-label="Secret Content"
            style={{
              marginTop: 40,
              padding: 20,
              backgroundColor: '#222',
              borderRadius: 10,
              border: '2px solid #0f0',
              color: '#0f0',
            }}
          >
            <h2>Secret Content Unlocked!</h2>
            <p>
              You found the secret phrase! Here's your hidden content.
            </p>
          </section>
        )}
      </main>
    </>
  );
};

const styles = {
  container: {
    maxWidth: 1000,
    margin: 'auto',
    color: '#eee',
    fontFamily: "'Consolas', monospace",
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  controlsContainer: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  },
  input: {
    width: '100%',
    maxWidth: 400,
    padding: 10,
    fontSize: 18,
    borderRadius: 8,
    border: '1px solid #555',
    backgroundColor: '#222',
    color: '#eee',
  },
  tagsContainer: {
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  tagButton: {
    padding: '6px 12px',
    borderRadius: 8,
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
  },
  tagButtonActive: {
    backgroundColor: '#0f0',
    color: '#000',
  },
  statusText: {
    fontSize: 18,
    textAlign: 'center' as const,
    marginTop: 20,
  },
  articlesSection: {
    marginTop: 30,
  },
  articleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  articleItem: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '1px solid #444',
    display: 'flex',
    gap: 20,
  },
  thumbnail: {
    width: 120,
    height: 90,
    objectFit: 'cover' as const,
    borderRadius: 8,
    flexShrink: 0,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#0f0',
    textDecoration: 'none',
  },
  articleDescription: {
    fontSize: 14,
    color: '#bbb',
    margin: '8px 0',
  },
  articleMeta: {
    fontSize: 12,
    color: '#555',
  },
  articleTags: {
    marginTop: 10,
  },
  articleTag: {
    fontSize: 12,
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: 4,
    marginRight: 6,
    color: '#aaa',
  },
};

export default Home;
