// pages/api/fetch-feed.ts (or similar)
import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

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

  const content = `${article.title} ${article.description}`.toLowerCase();

  if (content.includes('podcast') || content.includes('audio')) {
    tags.push('audio');
  }

  if (content.includes('opinion') || content.includes('editorial')) {
    tags.push('article');
  }

  if (article.source.toLowerCase().includes('cnn') || content.includes('progressive')) {
    tags.push('left wing');
  }

  if (article.source.toLowerCase().includes('fox') || content.includes('conservative')) {
    tags.push('right wing');
  }

  // Example for alternative media
  if (content.includes('substack') || content.includes('independent')) {
    tags.push('alternative');
  }

  return tags;
};

const getThumbnail = (article: Article): string => {
  // ... same as your function
};

const parser = new Parser();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const feeds: string[] = req.body.feeds;

  if (!Array.isArray(feeds) || feeds.length === 0) {
    return res.status(400).json({ error: 'feeds must be a non-empty array' });
  }

  const allArticles: Article[] = [];

  for (const feedUrl of feeds.slice(0, 10)) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const source = feed.title || 'RSS Feed';

      const articles = (feed.items || []).slice(0, 15).map((item) => {
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
