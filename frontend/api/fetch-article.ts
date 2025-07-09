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

    // For each item, fetch full article content or prepare podcast metadata
    const articles = await Promise.all(
      feed.items.map(async (item) => {
        const audioUrl =
          item.enclosure?.type?.includes('mpeg') ||
          item.enclosure?.type?.includes('mp3') ||
          item.enclosure?.type?.includes('audio')
            ? item.enclosure.url
            : null;

        // If it's a podcast (has audio), no need to fetch page content
        if (audioUrl) {
          return {
            title: item.title || 'No title',
            content: `<audio controls src="${audioUrl}"></audio>`,
            audioUrl,
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.itunes?.image || feed.image?.url || '',
            description: item.contentSnippet || item.summary || '',
            tags: [],
          };
        }

        // Otherwise, treat as article and fetch full content
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
            audioUrl: null,
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.enclosure?.url || item.itunes?.image || '',
            description: item.contentSnippet || item.summary || '',
            tags: [],
          };
        } catch {
          return {
            title: item.title || 'No title',
            content: '<p>Failed to load article content.</p>',
            audioUrl: null,
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.enclosure?.url || '',
            description: item.contentSnippet || '',
            tags: [],
          };
        }
      })
    );

    const filteredArticles = articles.filter(Boolean);
    res.status(200).json({ articles: filteredArticles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}
