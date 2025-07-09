import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const parser = new Parser();

type CachedData = {
  timestamp: number;
  data: any;
};
const cache: Record<string, CachedData> = {};
const CACHE_TTL = 600000; // 10 minutes in ms
const MAX_ARTICLES = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { Url } = req.query;

  if (!Url || typeof Url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid Url parameter' });
  }

  // Check cache
  const cached = cache[Url];
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  try {
    // Parse RSS feed
    const feed = await parser.parseURL(Url);

    // Limit articles for performance
    const items = feed.items.slice(0, MAX_ARTICLES);

    // Fetch and parse full articles concurrently (with error handling)
    const articles = await Promise.all(
      items.map(async (item) => {
        if (!item.link) return null;

        try {
          const response = await fetch(item.link);
          if (!response.ok) throw new Error('Failed to fetch article');

          const html = await response.text();
          const dom = new JSDOM(html, { url: item.link });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          return {
            title: item.title || '',
            link: item.link,
            pubDate: item.pubDate || '',
            content: article?.content || '',
            excerpt: article?.excerpt || '',
          };
        } catch (error) {
          return {
            title: item.title || '',
            link: item.link,
            pubDate: item.pubDate || '',
            content: '',
            excerpt: '',
            error: 'Failed to fetch or parse article',
          };
        }
      })
    );

    const result = { articles: articles.filter(Boolean) };

    // Cache the result
    cache[Url] = {
      timestamp: now,
      data: result,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}
