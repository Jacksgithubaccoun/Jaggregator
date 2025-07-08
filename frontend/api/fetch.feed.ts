// src/pages/api/fetch-feed.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';

const parser = new Parser();

type Article = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string;
  thumbnail?: string;
  tags?: string[];
  feedUrl?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url in request body' });
    }

    // Parse the feed URL
    const feed = await parser.parseURL(url);

    // Map feed items to your articles format
    const articles: Article[] = feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || '',
      source: feed.title || '',
      thumbnail: item.enclosure?.url || '',
      tags: [], // no tags by default
      feedUrl: url,
    }));

    return res.status(200).json(articles);
  } catch (error) {
    console.error('Failed to fetch RSS feed:', error);
    return res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}

