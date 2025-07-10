import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:transcript', 'transcript'], // pull transcript from itunes:transcript if available
      ['itunes:summary', 'itunesSummary'], // optional fallback summary
    ],
  },
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
    const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;
const feed = await parser.parseURL(cacheBustedUrl);

    const articles = await Promise.all(
      feed.items.map(async (item) => {
        // Detect audio URLs from enclosure
        const audioUrlMp3 = item.enclosure?.type === 'audio/mpeg' ? item.enclosure.url : null;
        const audioUrlOgg = item.enclosure?.type === 'audio/ogg' ? item.enclosure.url : null;
        const audioUrlWebm = item.enclosure?.type === 'audio/webm' ? item.enclosure.url : null;
        const audioUrl = audioUrlMp3 || audioUrlOgg || audioUrlWebm;

        // Extract transcript from itunes:transcript field or fallback to itunesSummary or empty
        const transcript = item.transcript || item.itunesSummary || '';

        if (audioUrl) {
          return {
            title: item.title || 'No title',
            content: '', // avoid loading audio in content to keep it lazy
            audioUrl: `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`, // proxy instead of direct load
            transcript,
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.itunes?.image || feed.image?.url || '',
            description: item.contentSnippet || item.summary || '',
            tags: ['audio'],
          };
        }

        // Validate article link
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
            thumbnail: item.enclosure?.url || item.itunes?.image || '',
            description: item.contentSnippet || '',
            tags: ['article'],
          };
        }

        try {
          const response = await fetch(item.link);
          if (!response.ok) throw new Error(`Failed to fetch: ${item.link}`);

          const html = await response.text();
          const dom = new JSDOM(html, { url: item.link });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          return {
            title: article?.title || item.title || 'No title',
            content: article?.content || '<p>No content available</p>',
            audioUrl: null,
            transcript: '', // no transcript for regular articles
            link: item.link,
            pubDate: item.pubDate || '',
            source: feed.title || '',
            thumbnail: item.enclosure?.url || item.itunes?.image || '',
            description: item.contentSnippet || item.summary || '',
            tags: ['article'],
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
            thumbnail: item.enclosure?.url || '',
            description: item.contentSnippet || '',
            tags: ['article'],
          };
        }
      })
    );

    const filteredArticles = articles.filter(Boolean);
    filteredArticles.sort((a, b) => {
  const dateA = new Date(a.pubDate || 0).getTime();
  const dateB = new Date(b.pubDate || 0).getTime();
  return dateB - dateA; // newest first
});

res.setHeader('Cache-Control', 'no-store'); // optional, disables caching
    res.status(200).json({ articles: filteredArticles });
  } catch (error) {
    console.error('Failed to fetch or parse RSS feed:', error);
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed' });
  }
}
    // Extract image URLs from the article content
    const contentDom = new JSDOM(article.content);
    const images = Array.from(contentDom.window.document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src && src.startsWith('http'));

    res.status(200).json({
      title: article.title,
      content: article.content, // HTML string
      images, // array of image URLs
    });
  } catch (error) {
    console.error('Error fetching/parsing article:', error);
    res.status(500).json({ error: 'Error fetching or parsing article' });
  }
}
