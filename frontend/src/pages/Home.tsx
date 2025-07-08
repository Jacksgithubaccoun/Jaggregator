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
  const [error, setError] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Restore feeds from localStorage on mount and fetch articles for all feeds
  useEffect(() => {
    const loadFeeds = async () => {
      try {
        const savedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
        setFeeds(savedFeeds);

        // Fetch articles from all saved feeds in parallel
        const articlesArrays = await Promise.all(
          savedFeeds.map(async (url: string) => {
            try {
              const res = await fetch('/api/fetch-feed', {
                method: 'POST',
                body: JSON.stringify({ url }),
                headers: { 'Content-Type': 'application/json' },
              });

              if (!res.ok) {
                const text = await res.text();
                console.error('Error fetching feed:', text);
                return [];
              }

              return await res.json();
            } catch (err) {
              console.error('Error fetching feed:', err);
              return [];
            }
          })
        );

        // Flatten the arrays of articles into a single array
        setArticles(articlesArrays.flat());
      } catch (err) {
        setError('Failed to fetch articles from saved feeds.');
        console.error(err);
      }
    };

    loadFeeds();
  }, []);

  // Save feeds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }, [feeds]);

  const addFeed = async (url: string): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      if (feeds.includes(url)) return;

      console.log('Sending feed URL:', url);

      const res = await fetch('./fetch-articles', {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to fetch feed');
      }

      const newArticles = await res.json();

      setFeeds((prev) => [...prev, url]);
      setArticles((prev) => [...prev, ...newArticles]);
    } catch (err) {
      console.error('Add feed error:', err);
      setError('Failed to add feed.');
    } finally {
      setLoading(false);
    }
  };

  const removeFeed = async (url: string): Promise<void> => {
    setFeeds((prev) => prev.filter((f) => f !== url));
    setArticles((prev) => prev.filter((a) => a.feedUrl !== url)); // Optional: remove articles from removed feed
  };

  const clearError = () => setError('');

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
            {filteredArticles.map((article) => (
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
                  <div style={styles.articleTags}>
                    {article.tags?.map((tag: string) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 900,
    margin: '0 auto',
    padding: 20,
    fontFamily: "'Courier New', Courier, monospace",
    color: '#0f0',
    minHeight: '100vh',
  },
  title: {
    textAlign: 'center',
  },
  controlsContainer: {
    marginTop: 20,
  },
  input: {
    width: '100%',
    padding: 8,
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  tagsContainer: {
    marginTop: 20,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tagButton: {
    border: '1px solid #ccc',
    borderRadius: 20,
    padding: '5px 15px',
    background: '#eee',
    cursor: 'pointer',
  },
  tagButtonActive: {
    background: '#0070f3',
    color: '#fff',
    borderColor: '#0070f3',
  },
  statusText: {
    marginTop: 20,
    textAlign: 'center',
  },
  articlesSection: {
    marginTop: 30,
  },
  articleList: {
    listStyle: 'none',
    padding: 0,
  },
  articleItem: {
    display: 'flex',
    gap: 15,
    padding: 15,
    borderBottom: '1px solid #ddd',
  },
  thumbnail: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    borderRadius: 8,
    flexShrink: 0,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0070f3',
    textDecoration: 'none',
  },
  articleDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#ccc',
  },
  articleMeta: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  articleTags: {
    marginTop: 6,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    background: '#333',
    color: '#0f0',
    borderRadius: 12,
    padding: '2px 8px',
  },
};

export default Home;

