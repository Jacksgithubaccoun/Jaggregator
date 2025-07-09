// pages/api/proxy-audio.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';

const cache = new Map<string, Buffer>(); // Simple in-memory cache for files < 10MB

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
  const range = req.headers.range || '';

  // Serve from cache if available
  if (cache.has(decodedUrl)) {
    const cachedData = cache.get(decodedUrl)!;

    if (range) {
      const bytesPrefix = 'bytes=';
      if (range.startsWith(bytesPrefix)) {
        const bytesRange = range.substring(bytesPrefix.length).split('-');
        const start = parseInt(bytesRange[0], 10);
        const end = bytesRange[1] ? parseInt(bytesRange[1], 10) : cachedData.length - 1;

        if (!isNaN(start) && !isNaN(end) && start <= end) {
          const chunk = cachedData.slice(start, end + 1);
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${cachedData.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunk.length,
            'Content-Type': 'audio/mpeg', // Adjust MIME type if needed
          });
          res.end(chunk);
          return;
        }
      }
    }

    // No or invalid Range header: send full file
    res.writeHead(200, {
      'Content-Length': cachedData.length,
      'Content-Type': 'audio/mpeg', // Adjust MIME type if needed
      'Accept-Ranges': 'bytes',
    });
    res.end(cachedData);
    return;
  }

  // Not cached: proxy request with Range header
  const options = {
    headers: {
      Range: range,
    },
  };

  const proxyReq = client.get(targetUrl, options, (proxyRes) => {
    const statusCode = proxyRes.statusCode || 200;

    const contentLength = parseInt(proxyRes.headers['content-length'] || '0', 10);

    if (contentLength > 0 && contentLength < 10 * 1024 * 1024) {
      // Cache small files (<10MB)
      const chunks: Buffer[] = [];
      res.writeHead(statusCode, proxyRes.headers);

      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        cache.set(decodedUrl, fullBuffer);
        res.end();
      });

      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err);
        if (!res.headersSent) {
          res.status(500).send('Proxy response error');
        }
      });
    } else {
      // Large files: stream without caching
      res.writeHead(statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error proxying audio');
    }
  });
}
