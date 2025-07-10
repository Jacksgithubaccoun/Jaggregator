// pages/api/fetch-article-content.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch article' });
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).json({ error: 'Failed to parse article content' });
    }

    // Use JSDOM to extract plain text from the HTML string returned by Readability
    const contentDom = new JSDOM(article.content);
    const textContent = contentDom.window.document.body.textContent || '';

    res.status(200).json({
      title: article.title,
      content: article.content,       // Optional: full HTML
      text: textContent.trim(),       // ✅ Add this: clean plain-text version
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching or parsing article' });
  }
}
