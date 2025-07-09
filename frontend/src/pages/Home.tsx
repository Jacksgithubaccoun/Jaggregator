import React, { useEffect, useState } from 'react';
import FeedsManager from '../components/FeedsManager';
import MatrixRain from '../components/MatrixRain';
import '../matrix-theme.css';

const allTags = ['audio', 'article', 'left wing', 'right wing', 'alternative'];

function AudioPlayer({ audioSources }: { audioSources: Record<string, string> }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <div style={{ color: '#ccc', marginBottom: 8 }}>Loading audio...</div>}
      <audio
        controls
        style={{ width: '100%' }}
        onCanPlay={() => setLoading(false)}
        onError={() => setLoading(false)}
      >
        {audioSources.mp3 && <source src={audioSources.mp3} type="audio/mpeg" />}
        {audioSources.ogg && <source src={audioSources.ogg} type="audio/ogg; codecs=opus" />}
        {audioSources.webm && <source src={audioSources.webm} type="audio/webm" />}
        {audioSources.fallback && !audioSources.fallback.match(/\.(mp3|ogg|webm)$/i) && <source src={audioSources.fallback} />}
        Your browser does not support the audio element.
      </audio>
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

  const [expandedContent, setExpandedContent] = useState<Record<
    string,
    { content: string; audioSources: Record<string, string>; transcript: string }
  >>({});

  const [loadingFullArticle, setLoadingFullArticle] = useState(false);

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
    setFeeds((prev) => [...prev, url]);
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

  const expandArticle = async (link: string) => {
    if (expandedArticle === link) {
      setExpandedArticle(null);
      return;
    }

    setExpandedArticle(link);

    if (!expandedContent[link]) {
      setLoadingFullArticle(true);
      try {
        const res = await fetch(`/api/fetch-full-article?url=${encodeURIComponent(link)}`);
        if (!res.ok) throw new Error('Failed to load full article');
        const data = await res.json();
        setExpandedContent((prev) => ({
          ...prev,
          [link]: {
            content: data.content || 'No content available.',
            audioSources: {
              mp3: data.audioUrlMp3 || '',
              ogg: data.audioUrlOgg || '',
              webm: data.audioUrlWebm || '',
              fallback: data.audioUrl || '',
            },
            transcript: data.transcript || '',
          },
        }));
      } catch {
        setExpandedContent((prev) => ({
          ...prev,
          [link]: { content: 'Failed to load full article.', audioSources: {}, transcript: '' },
        }));
      } finally {
        setLoadingFullArticle(false);
      }
    }
  };

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
      <main
        style={{
          maxWidth: 900,
          margin: '20px auto',
          padding: 16,
          color: '#ccc',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 16, textAlign: 'center' }}>Jaggregator</h1>
        <FeedsManager
          feeds={feeds}
          addFeed={addFeed}
          removeFeed={removeFeed}
          loading={loading}
          error={error}
          clearError={clearError}
        />
        <section style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              background: '#222',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#eee',
            }}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Filter by source name..."
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginTop: 8,
              background: '#222',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#eee',
            }}
            disabled={loading}
          />
        </section>
        <section
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                backgroundColor: selectedTags.includes(tag) ? '#0f0' : '#333',
                border: '1px solid #555',
                borderRadius: 4,
                color: selectedTags.includes(tag) ? '#000' : '#ccc',
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: selectedTags.includes(tag) ? 'bold' : 'normal',
              }}
              disabled={loading}
            >
              {tag}
            </button>
          ))}
        </section>
        {loading && (
  <p style={{ textAlign: 'center', marginTop: 16, fontStyle: 'italic', color: '#ccc' }}>
    Loading articles...
  </p>
)}
        {!loading && error && (
          <p
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontStyle: 'italic',
              color: '#f66',
            }}
          >
            {error}
          </p>
        )}
        <section>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visibleArticles.map((article, idx) => {
              const key = article.link || `article-${idx}`;
              const expanded = expandedContent[article.link] || null;
              return (
                <li
                  key={key}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderBottom: '1px solid #444',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <img
                      src={article.thumbnail || '/images/fallback.png'}
                      alt="thumbnail"
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                      onError={(e) => (e.currentTarget.src = '/images/fallback.png')}
                    />
                    <div style={{ flex: 1 }}>
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#0f0',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                        }}
                      >
                        {article.title}
                      </a>
                      <p
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: '#888',
                        }}
                      >
                        {new Date(article.pubDate).toLocaleString()} |{' '}
                        {article.source || 'Unknown source'}
                      </p>
                      <p
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          color: '#ccc',
                        }}
                      >
                        {article.description}
                      </p>
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        {article.tags?.map((tag: string) => (
                          <span
                            key={tag}
                            style={{
                              backgroundColor: '#222',
                              border: '1px solid #555',
                              borderRadius: 3,
                              padding: '2px 6px',
                              fontSize: 11,
                              color: '#0f0',
                              cursor: 'default',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => expandArticle(article.link)}
                        style={{
                          marginTop: 10,
                          backgroundColor: '#111',
                          color: '#0f0',
                          border: '1px solid #0f0',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        {expandedArticle === article.link ? 'Collapse' : 'Read More'}
                      </button>
                      {expandedArticle === article.link && (
                        <div
                          style={{
                            marginTop: 12,
                            backgroundColor: '#111',
                            padding: 16,
                            borderRadius: 6,
                            color: '#ccc',
                            maxWidth: '100%',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {loadingFullArticle && !expanded ? (
                            <p>Loading full article...</p>
                          ) : expanded ? (
                            <>
                              <div
                                dangerouslySetInnerHTML={{ __html: expanded.content }}
                                style={{ marginBottom: 12 }}
                              />
                              {Object.values(expanded.audioSources).some(Boolean) && (
                                <AudioPlayer audioSources={expanded.audioSources} />
                              )}
                              {expanded.transcript && (
                                <details style={{ marginTop: 12 }}>
                                  <summary style={{ cursor: 'pointer' }}>
                                    Show Transcript
                                  </summary>
                                  <pre
                                    style={{
                                      whiteSpace: 'pre-wrap',
                                      marginTop: 8,
                                      fontSize: 13,
                                      backgroundColor: '#222',
                                      padding: 8,
                                      borderRadius: 4,
                                      maxHeight: 200,
                                      overflowY: 'auto',
                                      color: '#ccc',
                                    }}
                                  >
                                    {expanded.transcript}
                                  </pre>
                                </details>
                              )}
                            </>
                          ) : (
                            <p>No full article content available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {visibleCount < filteredArticlesSorted.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                backgroundColor: '#0f0',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#000',
              }}
            >
              Load More
            </button>
          )}
        </section>
        {showSecret && (
          <section
            style={{
              marginTop: 32,
              backgroundColor: '#222',
              padding: 16,
              borderRadius: 6,
              textAlign: 'center',
              color: '#0f0',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            Secret mode activated: The powers that be.
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

