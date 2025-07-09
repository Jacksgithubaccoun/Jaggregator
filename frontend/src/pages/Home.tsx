// src/pages/Home.tsx
import React, { useEffect, useState } from 'react';
import FeedsManager from '../components/FeedsManager';
import MatrixRain from '../components/MatrixRain';
import '../matrix-theme.css';

const allTags = ['audio', 'article', 'left wing', 'right wing', 'alternative'];

type Article = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  tags?: string[];
  thumbnail?: string;
  audioUrl?: string;
};

const Home: React.FC = () => {
  const [feeds, setFeeds] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [loadingFullArticle, setLoadingFullArticle] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const [expandedArticleLink, setExpandedArticleLink] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>('');

  // Secret phrase logic
  const [typedKeys, setTypedKeys] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Listen for secret phrase "thepowersthatbe"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setTypedKeys((prev) => {
        const updated = (prev + e.key.toLowerCase()).replace(/[^a-z]/g, '').slice(-30);
        if (updated.includes('thepowersthatbe')) setShowSecret(true);
        return updated;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load feeds from localStorage on mount and fetch articles
  useEffect(() => {
    const loadSavedFeeds = async () => {
      try {
        const savedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
        if (Array.isArray(savedFeeds)) {
          setFeeds(savedFeeds);
          setLoadingFeeds(true);
          const fetchedArticles = await fetchArticlesFromFeeds(savedFeeds);
          setArticles(fetchedArticles);
        }
      } catch {
        setError('Failed to load saved feeds.');
      } finally {
        setLoadingFeeds(false);
      }
    };
    loadSavedFeeds();
  }, []);

  // Save feeds to localStorage when feeds change
  useEffect(() => {
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }, [feeds]);

  // Fetch articles helper
  const fetchArticlesFromFeeds = async (feedUrls: string[]) => {
    try {
      const responses = await Promise.all(
        feedUrls.map(async (url) => {
          const res = await fetch('/api/fetch-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feeds: [url] }),
          });
          if (!res.ok) return [];
          return await res.json();
        })
      );
      // Flatten array of arrays and sort by pubDate descending
      return responses.flat().sort(
        (a: Article, b: Article) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
    } catch {
      setError('Failed to fetch articles.');
      return [];
    }
  };

  // Add a new feed
  const addFeed = async (url: string) => {
    if (feeds.includes(url)) return;
    setLoadingFeeds(true);
    setError('');
    try {
      const newArticles = await fetchArticlesFromFeeds([url]);
      setFeeds((prev) => [...prev, url]);
      setArticles((prev) => [...prev, ...newArticles]);
    } catch {
      setError('Failed to add feed.');
    } finally {
      setLoadingFeeds(false);
    }
  };

  // Remove a feed and its articles
  const removeFeed = async (url: string): Promise<void> => {
  setFeeds((prev) => prev.filter((f) => f !== url));
  setArticles((prev) => prev.filter((a) => a.feedUrl !== url));
};

  // Toggle tags filter
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Filter articles based on tags, search term, and source filter
  const filteredArticles = articles.filter((article) => {
    const matchesTags =
      selectedTags.length === 0 ||
      article.tags?.some((tag) => selectedTags.includes(tag));
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource =
      sourceFilter.trim() === '' ||
      article.source.toLowerCase().includes(sourceFilter.toLowerCase());
    return matchesTags && matchesSearch && matchesSource;
  });

  // Articles currently visible (pagination)
  const visibleArticles = filteredArticles.slice(0, visibleCount);

  // Handler to expand or collapse an article and fetch full content
  const toggleExpandArticle = async (article: Article) => {
    if (expandedArticleLink === article.link) {
      // Collapse if already expanded
      setExpandedArticleLink(null);
      setExpandedContent('');
      return;
    }

    setExpandedArticleLink(article.link);
    setLoadingFullArticle(true);

    try {
      const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(article.link)}`);
      const data = await res.json();
      setExpandedContent(data.content || '<p>Failed to load content</p>');
    } catch {
      setExpandedContent('<p>Failed to load content</p>');
    } finally {
      setLoadingFullArticle(false);
    }
  };

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
          loading={loadingFeeds}
          error={error}
          clearError={() => setError('')}
        />

        <section aria-label="Search and filter" style={styles.controlsContainer}>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
            disabled={loadingFeeds}
          />
          <input
            type="text"
            placeholder="Filter by source name..."
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ ...styles.input, marginTop: 8 }}
            disabled={loadingFeeds}
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
              disabled={loadingFeeds}
            >
              {tag}
            </button>
          ))}
        </section>

        {loadingFeeds && <p style={styles.statusText}>Loading articles...</p>}
        {!loadingFeeds && error && (
          <p role="alert" style={{ ...styles.statusText, color: '#f66' }}>
            {error}
          </p>
        )}

        <section aria-label="News articles" style={styles.articlesSection}>
          {filteredArticles.length === 0 && !loadingFeeds && !error && (
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

                  {/* Audio player if available */}
                  {article.audioUrl && (
                    <audio controls style={{ width: '100%', marginTop: 10 }}>
                      <source src={article.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}

                  {/* Read here / Hide button + Visit source */}
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => toggleExpandArticle(article)}
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
                      aria-expanded={expandedArticleLink === article.link}
                    >
                      {expandedArticleLink === article.link
                        ? loadingFullArticle
                          ? 'Loading...'
                          : 'Hide'
                        : 'Read here'}
                    </button>

                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0f0',
                        textDecoration: 'underline',
                        fontSize: 14,
                      }}
                    >
                      Visit source
                    </a>
                  </div>

                  {/* Expanded article content */}
                  {expandedArticleLink === article.link && !loadingFullArticle && (
                    <article
                      style={{
                        marginTop: 15,
                        backgroundColor: '#111',
                        borderRadius: 8,
                        padding: 20,
                        color: '#ddd',
                        overflowWrap: 'break-word',
                      }}
                      dangerouslySetInnerHTML={{ __html: expandedContent }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Load more button */}
          {visibleCount < filteredArticles.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              style={{
                marginTop: 20,
                padding: '8px 16px',
                fontSize: 16,
                cursor: 'pointer',
                backgroundColor: '#0f0',
                border: 'none',
                borderRadius: 6,
              }}
            >
              Load more articles
            </button>
          )}
        </section>

        {/* Secret Easter egg */}
        {showSecret && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              backgroundColor: '#0f0',
              color: '#000',
              padding: 12,
              borderRadius: 8,
              fontWeight: 'bold',
              boxShadow: '0 0 10px #0f0',
            }}
          >
            Welcome to the secret hidden zone! ⚡
          </div>
        )}
      </main>
    </>
  );
};

// Styles for the page
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 980,
    margin: 'auto',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    color: '#eee',
    minHeight: '100vh',
  },
  title: {
    fontSize: 36,
    marginBottom: 24,
    textAlign: 'center',
    color: '#0f0',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 8,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #444',
    backgroundColor: '#222',
    color: '#eee',
  },
  tagsContainer: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagButton: {
    backgroundColor: '#222',
    color: '#aaa',
    border: '1px solid #555',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  tagButtonActive: {
    backgroundColor: '#0f0',
    color: '#000',
    borderColor: '#0f0',
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  articlesSection: {
    marginTop: 20,
  },
  articleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  articleItem: {
    display: 'flex',
    gap: 20,
    marginBottom: 30,
    borderBottom: '1px solid #444',
    paddingBottom: 20,
  },
  thumbnail: {
    width: 100,
    height: 100,
    objectFit: 'contain',
    borderRadius: 8,
    backgroundColor: '#111',
    flexShrink: 0,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    color: '#0f0',
    fontSize: 18,
    fontWeight: 'bold',
    textDecoration: 'none',
  },
  articleDescription: {
    color: '#aaa',
    marginTop: 6,
  },
  articleMeta: {
    color: '#666',
    marginTop: 6,
    fontSize: 12,
  },
};

export default Home;
