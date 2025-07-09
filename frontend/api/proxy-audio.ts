// pages/api/proxy-audio.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';

type CacheEntry = {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const MAX_CACHE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max cache file size

const cache = new Map<string, CacheEntry>();

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

  const now = Date.now();

  // Check cache entry and expiration
  if (cache.has(decodedUrl)) {
    const cached = cache.get(decodedUrl)!;
    if (cached.expiresAt > now) {
      const cachedData = cached.buffer;
      const contentType = cached.contentType;
      const range = req.headers.range || '';

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
              'Content-Type': contentType,
            });
            res.end(chunk);
            return;
          }
        }
      }

      // No range or invalid range: serve full cached file
      res.writeHead(200, {
        'Content-Length': cachedData.length,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      res.end(cachedData);
      return;
    } else {
      // Cache expired, delete it
      cache.delete(decodedUrl);
    }
  }

  const client = targetUrl.protocol === 'https:' ? https : http;
  const range = req.headers.range || '';

  const options = {
    headers: {
      Range: range,
    },
  };

  const proxyReq = client.get(targetUrl, options, (proxyRes) => {
    const statusCode = proxyRes.statusCode || 200;
    const contentLength = parseInt(proxyRes.headers['content-length'] || '0', 10);
    const contentType = proxyRes.headers['content-type'] || 'audio/mpeg';

    if (contentLength > 0 && contentLength <= MAX_CACHE_SIZE_BYTES) {
      // Cache small files with TTL
      const chunks: Buffer[] = [];
      res.writeHead(statusCode, proxyRes.headers);

      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        cache.set(decodedUrl, {
          buffer: fullBuffer,
          contentType,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        res.end();
      });

      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err);
        if (!res.headersSent) {
          res.status(500).send('Proxy response error');
        }
      });
    } else {
      // Large files or unknown length: stream without caching
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
