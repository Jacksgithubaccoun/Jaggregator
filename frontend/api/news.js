// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

const parser = new Parser();

let cache = {
  timestamp: 0,
  data: null as any | null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const sourceBiasMap: Record<string, string> = {
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

function detectTags(article: any): string[] {
  const tags: string[] = [];

  if (
    (article.title && article.title.toLowerCase().includes('podcast')) ||
    (article.description && article.description.toLowerCase().includes('audio')) ||
    (article.link && article.link.toLowerCase().endsWith('.mp3'))
  ) {
    tags.push('audio');
  } else {
    tags.push('article');
  }

  let domain = '';
  try {
    const url = new URL(article.link);
    domain = url.hostname.replace('www.', '');
  } catch {
    domain = article.source?.toLowerCase() || '';
  }

  const bias = sourceBiasMap[domain];
  if (bias) tags.push(bias);

  return tags;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (Date.now() - cache.timestamp < CACHE_DURATION && cache.data) {
    return res.status(200).json(cache.data);
  }

  const rssFeeds: string[] = [
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    // Add more RSS feed URLs here
  ];

  let rssArticles: any[] = [];

  try {
    for (const feedUrl of rssFeeds) {
      const feed = await parser.parseURL(feedUrl);

      feed.items.forEach(item => {
        rssArticles.push({
          title: item.title || 'No title',
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.title || 'RSS Feed',
          description: item.contentSnippet || item.content || '',
          audioUrl: item.enclosure?.url || null,
          audioType: item.enclosure?.type || null,
        });
      });
    }

    const combined = rssArticles
      .map(article => ({
        ...article,
        tags: detectTags(article),
      }))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    cache = { timestamp: Date.now(), data: combined };

    res.status(200).json(combined);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}
