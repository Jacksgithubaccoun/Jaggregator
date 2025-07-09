import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Parser from 'rss-parser';

const parser = new Parser();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    // Parse RSS feed
    const feed = await parser.parseURL(url);

    // For each item, fetch full article content
    const articles = await Promise.all(
      feed.items.map(async (item) => {
        if (!item.link) return null;

        try {
          const response = await fetch(item.link);
          const html = await response.text();
          const dom = new JSDOM(html, { url: item.link });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          return {
            title: article?.title || item.title || 'No title',
            content: article?.content || '<p>No content available</p>',
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.enclosure?.url || '', // optional
            description: item.contentSnippet || '',
            tags: [], // optional, could extract if available
          };
        } catch {
          // Return fallback if fetch fails for an article
          return {
            title: item.title || 'No title',
            content: '<p>Failed to load article content.</p>',
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: '',
            description: item.contentSnippet || '',
            tags: [],
          };
        }
      })
    );

    // Filter out nulls if any
    const filteredArticles = articles.filter(Boolean);

    res.status(200).json({ articles: filteredArticles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}

