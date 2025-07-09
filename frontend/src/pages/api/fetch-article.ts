// src/pages/api/fetch-article.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const raw = await fetch(url);
    const html = await raw.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).json({ error: 'Failed to parse article' });
    }

    return res.status(200).json({
      title: article.title,
      content: article.content,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching article' });
  }
}
