const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const parser = new Parser();

const FEEDS_FILE = path.join(__dirname, 'feeds.json');

// Allow only trusted frontend origins
const allowedOrigins = [
  'https://jaggregator.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy does not allow access from this origin.'));
  }
}));

app.use(express.json());

// Load feeds from file
let feeds = [];
try {
  if (fs.existsSync(FEEDS_FILE)) {
    feeds = JSON.parse(fs.readFileSync(FEEDS_FILE, 'utf-8'));
  }
} catch (err) {
  console.error('Failed to read feeds file:', err.message);
  feeds = [];
}

// Save feeds to file
function saveFeeds() {
  try {
    fs.writeFileSync(FEEDS_FILE, JSON.stringify(feeds, null, 2));
  } catch (err) {
    console.error('Failed to save feeds file:', err.message);
  }
}

// Bias and thumbnail maps
const sourceBiasMap = {
  'cnn.com': 'left wing',
  'foxnews.com': 'right wing',
  'breitbart.com': 'right wing',
  'infowars.com': 'alternative',
  'nytimes.com': 'left wing',
  'npr.org': 'left wing',
  'bbc.co.uk': 'article',
  'thegatewaypundit.com': 'alternative',
  'theatlantic.com': 'left wing',
};

const sourceThumbnailMap = Object.fromEntries(
  Object.keys(sourceBiasMap).map(domain => [domain, `https://logo.clearbit.com/${domain}`])
);

// Helpers
const detectTags = (article) => {
  const tags = [];

  const lowerTitle = article.title?.toLowerCase() || '';
  const lowerDesc = article.description?.toLowerCase() || '';
  const isAudio = lowerTitle.includes('podcast') || lowerDesc.includes('audio') || article.link?.endsWith('.mp3');

  tags.push(isAudio ? 'audio' : 'article');

  let domain = '';
  try {
    const url = new URL(article.link);
    domain = url.hostname.replace('www.', '');
  } catch {
    domain = article.source?.toLowerCase();
  }

  if (sourceBiasMap[domain]) {
    tags.push(sourceBiasMap[domain]);
  }

  return tags;
};

const getThumbnail = (article) => {
  try {
    const domain = new URL(article.link).hostname.replace('www.', '');
    return sourceThumbnailMap[domain] || 'https://via.placeholder.com/40?text=No+Logo';
  } catch {
    return 'https://via.placeholder.com/40?text=No+Logo';
  }
};

// ──────────────── ROUTES ────────────────

// Get feeds
app.get('/feeds', (_req, res) => res.json({ feeds }));

// Add feed
app.post('/feeds', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid feed URL' });
  }
  if (feeds.includes(url)) {
    return res.status(400).json({ error: 'Feed already exists' });
  }

  feeds.push(url);
  saveFeeds();
  res.json({ success: true });
});

// Remove feed
app.delete('/feeds', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid feed URL' });
  }

  feeds = feeds.filter(f => f !== url);
  saveFeeds();
  res.json({ success: true });
});

// Fetch articles
app.post('/api/fetch-articles', async (req, res) => {
  const { feeds: inputFeeds } = req.body;

  if (!Array.isArray(inputFeeds) || inputFeeds.length === 0) {
    return res.status(400).json({ error: 'feeds must be a non-empty array' });
  }

  const MAX_FEEDS = 10;
  const feedsToFetch = inputFeeds.slice(0, MAX_FEEDS);

  let allArticles = [];

  for (const feedUrl of feedsToFetch) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const articles = (feed.items || []).slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: feed.title || 'RSS Feed',
        description: item.contentSnippet || item.content || '',
        tags: detectTags(item),
        thumbnail: getThumbnail(item),
      }));
      allArticles.push(...articles);
    } catch (err) {
      console.warn(`❌ Failed to parse ${feedUrl}: ${err.message}`);
    }
  }

  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  res.json(allArticles);
});

// ────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});


