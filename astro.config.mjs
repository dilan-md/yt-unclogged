// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Custom Vite plugin: proxy cobalt requests to avoid CORS
function cobaltProxyPlugin() {
  return {
    name: 'cobalt-proxy',
    configureServer(server) {
      // 0) SharedArrayBuffer support for FFmpeg
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        next();
      });

      // 1) POST /api/cobalt — forward API requests to cobalt instances
      server.middlewares.use('/api/cobalt-download', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders());
          res.end();
          return;
        }

        const tunnelUrl = new URL(req.url, 'http://localhost').searchParams.get('url');
        if (!tunnelUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url param' }));
          return;
        }

        try {
          const upstreamHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/'
          };
          const upstream = await fetch(tunnelUrl, { headers: upstreamHeaders });
          const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
          let contentDisposition = upstream.headers.get('content-disposition') || '';
          const contentLength = upstream.headers.get('content-length');

          // Ensure it triggers download attachment instead of opening inline
          if (!contentDisposition) {
            contentDisposition = 'attachment; filename="video.mp4"';
          } else if (contentDisposition.includes('inline')) {
            contentDisposition = contentDisposition.replace('inline', 'attachment');
          } else if (!contentDisposition.includes('attachment')) {
            contentDisposition = 'attachment; ' + contentDisposition;
          }

          const headers = {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
            ...corsHeaders(),
          };
          if (contentLength) headers['Content-Length'] = contentLength;

          res.writeHead(upstream.status, headers);

          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { res.end(); return; }
              res.write(value);
            }
          };
          await pump();
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });

      // 2) POST /api/cobalt-probe — check if a tunnel URL has real data
      server.middlewares.use('/api/cobalt-probe', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders());
          res.end();
          return;
        }

        const tunnelUrl = new URL(req.url, 'http://localhost').searchParams.get('url');
        if (!tunnelUrl) {
          res.writeHead(400, jsonCors());
          res.end(JSON.stringify({ ok: false, reason: 'Missing url param' }));
          return;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const upstreamHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/'
          };

          const upstream = await fetch(tunnelUrl, { signal: controller.signal, headers: upstreamHeaders });
          clearTimeout(timeout);

          if (!upstream.ok) {
            res.writeHead(200, jsonCors());
            res.end(JSON.stringify({ ok: false, reason: `HTTP ${upstream.status}` }));
            return;
          }

          const contentLength = upstream.headers.get('content-length');
          const estLength = upstream.headers.get('estimated-content-length');

          if (contentLength === '0' || estLength === '0') {
            try { controller.abort(); } catch (_) {}
            res.writeHead(200, jsonCors());
            res.end(JSON.stringify({ ok: false, reason: '0 bytes' }));
            return;
          }

          // Read first chunk
          const reader = upstream.body.getReader();
          const { done, value } = await reader.read();
          reader.releaseLock();
          try { controller.abort(); } catch (_) {}

          const hasData = !done && value && value.length > 0;
          res.writeHead(200, jsonCors());
          res.end(JSON.stringify({ ok: hasData, size: hasData ? value.length : 0 }));
        } catch (err) {
          res.writeHead(200, jsonCors());
          res.end(JSON.stringify({ ok: false, reason: err.message }));
        }
      });

      // 3) GET /api/server-info — proxy serverInfo checks to avoid browser console CORS/DNS errors
      server.middlewares.use('/api/server-info', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders());
          res.end();
          return;
        }

        const urlObj = new URL(req.url, 'http://localhost');
        const targetUrl = urlObj.searchParams.get('url');
        if (!targetUrl) {
          res.writeHead(400, jsonCors());
          res.end(JSON.stringify({ ok: false }));
          return;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const upstream = await fetch(`${targetUrl}/api/serverInfo`, { signal: controller.signal });
          clearTimeout(timeout);

          if (!upstream.ok) {
            res.writeHead(200, jsonCors());
            res.end(JSON.stringify({ ok: false }));
            return;
          }

          const data = await upstream.json();
          res.writeHead(200, jsonCors());
          res.end(JSON.stringify({ ok: true, data }));
        } catch (err) {
          res.writeHead(200, jsonCors());
          res.end(JSON.stringify({ ok: false }));
        }
      });

      // 4) POST /api/cobalt — forward API requests to cobalt instances
      server.middlewares.use('/api/cobalt', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders());
          res.end();
          return;
        }

        const targetUrl = req.headers['x-cobalt-target'];
        if (!targetUrl) {
          res.writeHead(400, jsonCors());
          res.end(JSON.stringify({ error: 'Missing X-Cobalt-Target header' }));
          return;
        }

        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();

        try {
          const cobaltRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] } : {}),
            },
            body,
          });

          const responseBody = await cobaltRes.text();
          res.writeHead(cobaltRes.status, jsonCors());
          res.end(responseBody);
        } catch (err) {
          res.writeHead(502, jsonCors());
          res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        }
      });
        // RapidAPI proxy for YouTube Media Downloader
        server.middlewares.use('/api/rapidapi', async (req, res) => {
          // Allow CORS
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'x-rapidapi-key, x-rapidapi-host');
          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }

          const urlObj = new URL(req.url, 'http://localhost');
          const videoId = urlObj.searchParams.get('videoId');
          if (!videoId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Missing videoId parameter' }));
            return;
          }

          const rapidApiKey = req.headers['x-rapidapi-key'];
          if (!rapidApiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Missing RapidAPI key' }));
            return;
          }

          const targetUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${encodeURIComponent(videoId)}`;
          try {
            const upstream = await fetch(targetUrl, {
              method: 'GET',
              headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com'
              }
            });
            const contentType = upstream.headers.get('content-type') || 'application/json';
            const data = await upstream.json();
            res.writeHead(upstream.status, { 'Content-Type': contentType, ...corsHeaders() });
            res.end(JSON.stringify(data));
          } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: err.message }));
          }
        });

      // 6) GET /api/rapidapi-download — proxy RapidAPI call and video stream in ONE execution to prevent IP mismatch 403s
      server.middlewares.use('/api/rapidapi-download', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'x-rapidapi-key, x-rapidapi-host');
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlObj = new URL(req.url, 'http://localhost');
        const videoId = urlObj.searchParams.get('videoId');
        const quality = urlObj.searchParams.get('quality') || '720';

        if (!videoId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Missing videoId parameter' }));
          return;
        }

        const rapidApiKey = req.headers['x-rapidapi-key'] || urlObj.searchParams.get('key');
        if (!rapidApiKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Missing RapidAPI key' }));
          return;
        }

        const targetUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${encodeURIComponent(videoId)}`;
        try {
          // Step 1: Fetch RapidAPI
          const apiRes = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com'
            }
          });

          if (!apiRes.ok) {
            const errText = await apiRes.text();
            res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `RapidAPI fetch failed: ${errText}` }));
            return;
          }
          const rapidData = await apiRes.json();
          
          const format = urlObj.searchParams.get('format') || 'mp4';
          let streamUrl = null;

          if (format === 'mp3') {
            if (!rapidData.audios || !rapidData.audios.items || rapidData.audios.items.length === 0) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'No audio streams found' }));
              return;
            }
            streamUrl = rapidData.audios.items[0].url;
          } else {
            if (!rapidData.videos || !rapidData.videos.items || rapidData.videos.items.length === 0) {
               res.writeHead(404, { 'Content-Type': 'application/json' });
               res.end(JSON.stringify({ message: 'No video streams found' }));
               return;
            }

            let videoItem = rapidData.videos.items.find(v => v.quality === quality + 'p' && v.hasAudio);
            if (!videoItem) {
                videoItem = rapidData.videos.items.find(v => v.hasAudio) || rapidData.videos.items[0];
            }
            
            streamUrl = videoItem.url;
          }

          if (!streamUrl) {
             res.writeHead(404, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ message: 'Invalid stream URL' }));
             return;
          }

          // Step 3: Stream the video
          const upstreamHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/'
          };

          const upstream = await fetch(streamUrl, { headers: upstreamHeaders });

          const contentType = upstream.headers.get('content-type') || 'video/mp4';
          let contentDisposition = upstream.headers.get('content-disposition') || '';

          if (!contentDisposition) {
            contentDisposition = 'attachment; filename="video.mp4"';
          } else if (contentDisposition.includes('inline')) {
            contentDisposition = contentDisposition.replace('inline', 'attachment');
          } else if (!contentDisposition.includes('attachment')) {
            contentDisposition = 'attachment; ' + contentDisposition;
          }

          const responseHeaders = {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
            ...corsHeaders(),
          };

          const contentLength = upstream.headers.get('content-length');
          if (contentLength) {
            responseHeaders['Content-Length'] = contentLength;
          }

          res.writeHead(upstream.status, responseHeaders);

          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { res.end(); return; }
              res.write(value);
            }
          };
          await pump();

        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: err.message }));
          }
        }
      });

    },
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Cobalt-Target, Authorization',
  };
}

function jsonCors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), cobaltProxyPlugin()],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    }
  }
});