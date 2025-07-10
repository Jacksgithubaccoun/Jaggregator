// src/pages/Home.tsx
import React, { useEffect, useState, useRef } from 'react';
import FeedsManager from '../components/FeedsManager';
import MatrixRain from '../components/MatrixRain';
import '../matrix-theme.css';

const allTags = ['audio', 'article', 'left wing', 'right wing', 'alternative'];

interface Article {
  link: string;
  title: string;
  description?: string;
  pubDate?: string;
  isoDate?: string;
  date?: string;
  source?: string;
  thumbnail?: string;
  tags?: string[];
  audioUrl?: string;
  audioUrlMp3?: string;
  audioUrlOgg?: string;
  audioUrlWebm?: string;
  feedUrl?: string;
}

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
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasAudio = !!audioUrlMp3 || !!audioUrlOgg || !!audioUrlWebm || !!audioUrl;

  const handleLoad = () => {
    if (!hasAudio) return;
    setShowPlayer(true);
    setLoading(true);
    setError(null);
  };

  const handleCanPlay = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError('Failed to load audio.');
  };

  const handlePauseClick = () => {
    audioRef.current?.pause();
  };

  return (
    <>
      {!showPlayer ? (
        <button
          onClick={handleLoad}
          disabled={!hasAudio}
          title={hasAudio ? undefined : 'No audio available'}
          aria-disabled={!hasAudio}
          style={{
            background: '#444',
            color: '#ccc',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 4,
            cursor: hasAudio ? 'pointer' : 'not-allowed',
            marginTop: 8,
            opacity: hasAudio ? 1 : 0.5,
          }}
        >
          ▶️ Load Audio
        </button>
      ) : (
        <>
          {loading && <div style={{ color: '#ccc', marginBottom: 8 }}>Loading audio...</div>}
          {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
          <audio
            ref={audioRef}
            controls
            preload="none"
            style={{ width: '100%' }}
            onCanPlay={handleCanPlay}
            onError={handleError}
          >
            {audioUrlMp3 && <source src={audioUrlMp3} type="audio/mpeg" />}
            {audioUrlOgg && <source src={audioUrlOgg} type="audio/ogg; codecs=opus" />}
            {audioUrlWebm && <source src={audioUrlWebm} type="audio/webm" />}
            {audioUrl && !audioUrl.match(/\.(mp3|ogg|webm)$/i) && <source src={audioUrl} />}
            Your browser does not support the audio element.
          </audio>

          <button
            onClick={handlePauseClick}
            aria-label="Pause audio"
            style={{
              background: '#666',
              color: '#eee',
              border: 'none',
              padding: '4px 8px',
              marginTop: 6,
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            ⏸ Pause
          </button>
        </>
      )}
    </>
  );
}

const Home: React.FC = () => {
  const [feeds, setFeeds] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const fullArticleCache = useRef<Record<string, string>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const clearError = () => setError('');

  // Unified filtering and sorting
  const filteredAndSortedArticles = articles
    .filter((article) => {
      const titleMatches = article.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const sourceMatches = !sourceFilter || article.source?.toLowerCase().includes(sourceFilter.toLowerCase());
      const tagsMatch = selectedTags.length === 0 || selectedTags.every((tag) => article.tags?.includes(tag));
      return titleMatches && sourceMatches && tagsMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.pubDate || a.isoDate || a.date || 0).getTime() || 0;
      const dateB = new Date(b.pubDate || b.isoDate || b.date || 0).getTime() || 0;
      return dateB - dateA; // newest first
    });

  const visibleArticles = filteredAndSortedArticles.slice(0, visibleCount);

  
 useEffect(() => {
  if (!loadMoreRef.current) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && visibleCount < filteredAndSortedArticles.length) {
        setVisibleCount((prev) => {
          const nextCount = prev + 10;
          return nextCount > filteredAndSortedArticles.length
            ? filteredAndSortedArticles.length
            : nextCount;
        });
      }
    },
    { rootMargin: '100px' } // <-- This was misplaced before
  );

  observer.observe(loadMoreRef.current);

  return () => {
    if (loadMoreRef.current) observer.unobserve(loadMoreRef.current);
  };
}, [filteredAndSortedArticles.length, visibleCount]);
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Example: handle secret key combos here
    // e.g. if (e.key === 'S') { ... }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [setShowSecret, setTypedKeys]);


useEffect(() => {
  const loadFeeds = async () => {
    setLoading(true);
    setLoadingProgress(0);
    try {
      const savedFeeds: string[] = JSON.parse(localStorage.getItem('feeds') || '[]');
      setFeeds(savedFeeds);

      let completed = 0;
      const total = savedFeeds.length;

      const articlesArrays = await Promise.all(
        savedFeeds.map(async (url) => {
          try {
            const res = await fetch(
              `/api/fetch-article?url=${encodeURIComponent(url)}&cacheBust=${Date.now()}`,
              { cache: 'no-store' }
            );
            if (!res.ok) return [];
            const data = await res.json();
            completed++;
          setLoadingProgress((completed / total) * 100); // update progress here
          return data.articles;
        } catch {
            completed++;
            setLoadingProgress((completed / total) * 100);

            return data.articles || [];
          } catch {
            completed++;
            setLoadingProgress((completed / total) * 100);
            return [];
          }
        })
      );

      const allArticles = articlesArrays.flat();
      const uniqueArticles = allArticles.filter(
        (article, index, self) => index === self.findIndex((a) => a.link === article.link)
      );

      uniqueArticles.sort((a, b) => {
        const dateA = new Date(a.pubDate || a.isoDate || a.date || 0).getTime() || 0;
        const dateB = new Date(b.pubDate || b.isoDate || b.date || 0).getTime() || 0;
        return dateB - dateA;
      });

      setArticles(uniqueArticles);
    } catch {
      setError('Failed to fetch articles from saved feeds.');
    } finally {
      setLoading(false);
    }
  };

  loadFeeds();
}, []);

  useEffect(() => {
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }, [feeds]);

  const addFeed = async (url: string): Promise<void> => {
    if (feeds.includes(url)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to fetch feed articles');
      const data = await res.json();

      const newArticles = data.articles.filter(
        (newArticle: Article) => !articles.some((a) => a.link === newArticle.link)
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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

  if (fullArticleCache.current[expandedArticle]) {
    setExpandedContent(fullArticleCache.current[expandedArticle]);
    setLoadingFullArticle(false);
    return;
  }

  const fetchFullArticle = async () => {
    setLoadingFullArticle(true);
    try {
      const res = await fetch(`/api/fetch-full-article?url=${encodeURIComponent(expandedArticle)}`);
      if (!res.ok) throw new Error('Failed to load full article');
      const data = await res.json();
      fullArticleCache.current[expandedArticle] = data.content || 'No content available.';
      setExpandedContent(fullArticleCache.current[expandedArticle]);
    } catch {
      setExpandedContent('Failed to load full article.');
    } finally {
      setLoadingFullArticle(false);
    }
  };

  fetchFullArticle();
}, [expandedArticle, articles]);

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
      
{loading && (
  <div style={{ width: '100%', background: '#eee', height: '6px', marginBottom: '1rem' }}>
    <div
      style={{
        width: `${loadingProgress}%`,
        background: '#4caf50',
        height: '100%',
        transition: 'width 0.3s ease-in-out',
      }}
      aria-label="Loading progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={loadingProgress}
    >
      <div
        style={{
          height: '100%',
          width: `${loadingProgress}%`,
          backgroundColor: '#0f0',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )}
      
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

     <section style={styles.articlesSection}>
        {visibleArticles.length === 0 ? (
          <p style={styles.statusText}>No articles found.</p>
        ) : (
          <>
            <ul style={styles.articleList}>
{visibleArticles.map((article) => (
  <li key={article.link} style={styles.articleItem}>
    {article.thumbnail && <img src={article.thumbnail} alt="" style={styles.thumbnail} />}
    <div style={styles.articleContent}>
      <a href={article.link} target="_blank" rel="noopener noreferrer" style={styles.articleTitle}>
        {article.title}
      </a>
      <p style={styles.articleDescription}>{article.description}</p>
      <div style={styles.articleMeta}>
        {article.source} · {article.pubDate}
      </div>

      {article.audioUrlMp3 || article.audioUrlOgg || article.audioUrlWebm || article.audioUrl ? (
        <AudioPlayer
          audioUrlMp3={article.audioUrlMp3 ?? null}
          audioUrlOgg={article.audioUrlOgg ?? null}
          audioUrlWebm={article.audioUrlWebm ?? null}
          audioUrl={article.audioUrl ?? null}
        />
      ) : (
        <>
          <button
            onClick={() => {
              if (expandedContent === article.link) {
                setExpandedContent('');
              } else {
                setExpandedContent(article.link);
                loadFullArticle(article.link); // function to load full content if you have one
              }
            }}
          >
            {expandedContent === article.link ? 'Collapse' : 'Expand Article'}
          </button>
          {expandedContent === article.link && (
            <div style={styles.fullArticleContent}>
              {loadingFullArticle ? 'Loading full article...' : /* render full article here */}
              {fullArticleCache.current[article.link]}
            </div>
          )}
        </>
      )}
    </div>
  </li>
))

            <div ref={loadMoreRef} style={{ height: 1 }} aria-hidden="true" />
          </>
        )}
      </section>
    </main>
  </>
);
};
  export default Home;
