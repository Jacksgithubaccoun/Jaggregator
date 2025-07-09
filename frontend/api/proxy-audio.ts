// pages/api/proxy-audio.ts
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

  const client = targetUrl.protocol === 'https:' ? https : http;

  const options = {
    headers: {
      // Forward Range header if present (for partial content streaming)
      Range: req.headers.range || '',
      // You can forward other headers if needed here
    },
  };

  const proxyReq = client.get(targetUrl, options, (proxyRes) => {
    // Forward status code (206 Partial Content if Range was requested)
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

    // Pipe data from the remote server directly to the client
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error proxying audio');
    }
  });
}
