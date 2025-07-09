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
        // Detect audio URL(s)
        const audioUrlMp3 = item.enclosure?.type === 'audio/mpeg' ? item.enclosure.url : null;
        const audioUrlOgg = item.enclosure?.type === 'audio/ogg' ? item.enclosure.url : null;
        const audioUrlWebm = item.enclosure?.type === 'audio/webm' ? item.enclosure.url : null;

        // Choose one audio URL to use in the player (prioritize mp3)
        const audioUrl = audioUrlMp3 || audioUrlOgg || audioUrlWebm;

        if (audioUrl) {
          // Podcast with audio: return minimal info + audio player embed
          return {
            title: item.title || 'No title',
            content: `<audio controls src="${audioUrl}"></audio>`,
            audioUrl,
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.itunes?.image || feed.image?.url || '',
            description: item.contentSnippet || item.summary || '',
            tags: ['audio'],
          };
        }

        // Otherwise treat as article and fetch full content
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
            tags: ['article'],
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
            tags: ['article'],
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
