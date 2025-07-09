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
      // Forward the Range header if present for partial content support
      ...(req.headers.range ? { Range: req.headers.range } : {}),
      // You can add other headers here if needed
    },
  };

  const proxyReq = client.get(targetUrl, options, (proxyRes) => {
    // Set CORS headers to allow your frontend to access the proxied resource
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

    // Pipe status and headers from target server to client response
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
