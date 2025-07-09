// pages/api/proxy-audio.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing URL');
    return;
  }

  const decodedUrl = decodeURIComponent(url);
  try {
    const proxyReq = https.get(decodedUrl, {
      headers: {
        Range: req.headers.range || '',
      },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(500).send('Error proxying audio');
    });
  } catch (err) {
    console.error('Proxy failure:', err);
    res.status(500).send('Internal server error');
  }
}
