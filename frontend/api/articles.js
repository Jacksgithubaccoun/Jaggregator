// pages/api/articles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

const parser = new Parser();

const sourceBiasMap: Record<string, string> = {
  'cnn.com': 'left wing',
  'foxnews.com': 'right wing',
  'breitbart.com': 'right wing',
  'infowars.com': 'alternative',
  // Add more domains as needed
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
  const rssFeeds: string[] = [
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    // Add your RSS feed URLs here
  ];

  let rssArticles: any[] = [];

  for (const feedUrl of rssFeeds) {
    try {
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
    } catch (err) {
      console.error(`Failed to parse feed: ${feedUrl}`, err);
    }
  }

  const combined = rssArticles
    .map(article => ({
      ...article,
      tags: detectTags(article),
    }))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);

  res.status(200).json(combined);
}

