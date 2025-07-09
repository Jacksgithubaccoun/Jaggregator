// pages/api/fetch-article.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).json({ error: 'Could not parse article' });
    }

    res.status(200).json({ content: article.content, title: article.title });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
}
