import Parser from 'rss-parser';
const parser = new Parser();

let cache = {
  timestamp: 0,
  data: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  if (Date.now() - cache.timestamp < CACHE_DURATION && cache.data) {
    return res.status(200).json(cache.data);
  }

  const rssFeeds = [
    // You can get this from your feeds API or hardcoded for now
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  ];

  let rssArticles = [];

  try {
    for (const feedUrl of rssFeeds) {
      const feed = await parser.parseURL(feedUrl);
      feed.items.forEach(item => {
        rssArticles.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.title || 'RSS Feed',
          description: item.contentSnippet || item.content || '',
        });
      });
    }

    // add your tags logic here...

    const combined = rssArticles
      .map(article => ({
        ...article,
        tags: detectTags(article),
      }))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    cache = { timestamp: Date.now(), data: combined };

    res.status(200).json(combined);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}

const sourceBiasMap = {
  // Left
  "nytimes.com": "left",
  "cnn.com": "left",
  "huffpost.com": "left",
  "msnbc.com": "left",
  "theguardian.com": "left",
  "salon.com": "left",
  "buzzfeednews.com": "left",
  "vox.com": "left",

  // Lean Left
  "politico.com": "lean left",
  "usatoday.com": "lean left",
  "cbsnews.com": "lean left",
  "nbcnews.com": "lean left",
  "theatlantic.com": "lean left",
  "time.com": "lean left",
  "slate.com": "lean left",
  "washingtonpost.com": "lean left",

  // Center
  "reuters.com": "center",
  "apnews.com": "center",
  "bbc.com": "center",
  "npr.org": "center",
  "usatoday.com": "center", 
  "wsj.com": "center",
  "forbes.com": "center",

  // Lean Right
  "thehill.com": "lean right",
  "wsj.com": "lean right",
  "nypost.com": "lean right",
  "dailycaller.com": "lean right",
  "breitbart.com": "lean right",
  "nationalreview.com": "lean right",
  "foxnews.com": "lean right",

  // Right
  "breitbart.com": "right",
  "foxnews.com": "right",
  "gatewaypundit.com": "right",
  "westernjournal.com": "right",
  "dailywire.com": "right",
  "newsmax.com": "right",

  // Alternative / Other
  "infowars.com": "alternative",
  "zerohedge.com": "alternative",
  "thefederalist.com": "alternative",
  "thedailybeast.com": "alternative",
  "theblaze.com": "alternative",

  // Misc / International
  "aljazeera.com": "center",
  "dw.com": "center",
  "france24.com": "center",
};

const sourceThumbnailMap = {
  'cnn.com': 'https://logo.clearbit.com/cnn.com',
  'foxnews.com': 'https://logo.clearbit.com/foxnews.com',
  'breitbart.com': 'https://logo.clearbit.com/breitbart.com',
  'infowars.com': 'https://logo.clearbit.com/infowars.com',
  'nytimes.com': 'https://logo.clearbit.com/nytimes.com',
  'npr.org': 'https://logo.clearbit.com/npr.org',
  'bbc.co.uk': 'https://logo.clearbit.com/bbc.co.uk',
  'thegatewaypundit.com': 'https://logo.clearbit.com/thegatewaypundit.com',
  'theatlantic.com': 'https://logo.clearbit.com/theatlantic.com',
};
