import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Parser from 'rss-parser';

const parser = new Parser({
  // No itunes custom fields since you want source data only
});

function isValidHttpUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    // Append cacheBust query param to avoid stale caches
    const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;
    const feed = await parser.parseURL(cacheBustedUrl);

    // Map through feed items, parse articles and extract images
    const articles = await Promise.all(
      feed.items.map(async (item) => {
        // Audio detection from enclosure, proxy URLs if found
        const audioUrlMp3 = item.enclosure?.type === 'audio/mpeg' ? item.enclosure.url : null;
        const audioUrlOgg = item.enclosure?.type === 'audio/ogg' ? item.enclosure.url : null;
        const audioUrlWebm = item.enclosure?.type === 'audio/webm' ? item.enclosure.url : null;
        const audioUrl = audioUrlMp3 || audioUrlOgg || audioUrlWebm;

        if (audioUrl) {
          return {
            title: item.title || 'No title',
            content: '', // no HTML content for audio items
            audioUrl: `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`, // proxy for audio
            transcript: '', // you can add if you want from your source
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: '', // no thumbnail for audio for now
            description: item.contentSnippet || item.summary || '',
            tags: ['audio'],
          };
        }

        // Validate article URL
        if (!item.link || !isValidHttpUrl(item.link)) {
          console.warn('Skipping invalid article link:', item.link);
          return {
            title: item.title || 'No title',
            content: '<p>Invalid or missing article link.</p>',
            audioUrl: null,
            transcript: '',
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: '',
            description: item.contentSnippet || '',
            tags: ['article'],
          };
        }

        // Try to fetch and parse article HTML content + extract images
        try {
          const response = await fetch(item.link);
          if (!response.ok) throw new Error(`Failed to fetch: ${item.link}`);

          const html = await response.text();
          const dom = new JSDOM(html, { url: item.link });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          // Extract all image URLs from article content
          const images = article?.content
            ? Array.from(new JSDOM(article.content).window.document.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src.startsWith('http'))
            : [];

          return {
            title: article?.title || item.title || 'No title',
            content: article?.content || '<p>No content available</p>',
            audioUrl: null,
            transcript: '', // no transcript for regular articles
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: images[0] || '', // use first image as thumbnail if exists
            description: item.contentSnippet || item.summary || '',
            tags: ['article'],
            images, // array of image URLs extracted from content
          };
        } catch (error) {
          console.error('Error fetching/parsing article:', item.link, error);
          return {
            title: item.title || 'No title',
            content: '<p>Failed to load article content.</p>',
            audioUrl: null,
            transcript: '',
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: '',
            description: item.contentSnippet || '',
            tags: ['article'],
          };
        }
      })
    );

    // Filter out any null or invalid results (if any)
    const filteredArticles = articles.filter(Boolean);

    // Sort articles by newest pubDate first
    filteredArticles.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    // Send response once with all processed articles
    res.setHeader('Cache-Control', 'no-store'); // optional no-cache
    res.status(200).json({ articles: filteredArticles });

  } catch (error) {
    console.error('Failed to fetch or parse RSS feed:', error);
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}


