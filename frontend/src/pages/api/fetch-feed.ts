import type { NextApiRequest, NextApiResponse } from 'next';
const Parser = require('rss-parser');  // Use require, not import

type Article = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  tags: string[];
  thumbnail: string;
};

const sourceBiasMap: Record<string, string> = {
  'cnn.com': 'left wing',
  'foxnews.com': 'right wing',
};

const sourceThumbnailMap: Record<string, string> = Object.fromEntries(
  Object.keys(sourceBiasMap).map((domain) => [
    domain,
    `https://logo.clearbit.com/${domain}`,
  ])
);

const detectTags = (article: Article): string[] => {
  const tags: string[] = [];
  const title = article.title.toLowerCase();
  const description = article.description.toLowerCase();
  const isAudio =
    title.includes('podcast') ||
    description.includes('audio') ||
    article.link.endsWith('.mp3');

  tags.push(isAudio ? 'audio' : 'article');

  let domain = '';
  try {
    domain = new URL(article.link).hostname.replace(/^www\./, '');
  } catch {
    domain = article.source?.toLowerCase() ?? '';
  }

  const bias = sourceBiasMap[domain];
  if (bias) tags.push(bias);

  return tags;
};

const getThumbnail = (article: Article): string => {
  let domain = '';
  try {
    domain = new URL(article.link).hostname.replace(/^www\./, '');
  } catch {
    domain = article.source?.toLowerCase() ?? '';
  }

  return (
    sourceThumbnailMap[domain] || 'https://via.placeholder.com/40?text=No+Logo'
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const feeds: string[] = req.body.feeds;

  if (!Array.isArray(feeds) || feeds.length === 0) {
    return res.status(400).json({ error: 'feeds must be a non-empty array' });
  }

  const parser = new Parser();  // Capital P here
  const allArticles: Article[] = [];

  for (const feedUrl of feeds.slice(0, 10)) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const source = feed.title || 'RSS Feed';

      const articles = (feed.items || []).slice(0, 15).map((item: any) => {
        // 'any' here because rss-parser doesn't export type with require
        const article: Article = {
          title: item.title || 'No title',
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source,
          description: item.contentSnippet || item.content || '',
          tags: [],
          thumbnail: '',
        };

        article.tags = detectTags(article);
        article.thumbnail = getThumbnail(article);
        return article;
      });

      allArticles.push(...articles);
    } catch (err: any) {
      console.warn(`Failed to parse ${feedUrl}: ${err.message}`);
    }
  }

  allArticles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return res.status(200).json(allArticles);
}

