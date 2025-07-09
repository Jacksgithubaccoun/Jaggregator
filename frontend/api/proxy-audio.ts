import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing URL');
    return;
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    res.status(400).send('Invalid URL encoding');
    return;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(decodedUrl);
  } catch {
    res.status(400).send('Invalid URL');
    return;
  }

  // Choose correct client based on protocol
  const client = targetUrl.protocol === 'https:' ? https : http;

  const options = {
    headers: {
      Range: req.headers.range || '',
      // Add other headers as needed
    },
  };

  const proxyReq = client.get(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error proxying audio');
    }
  });
}
