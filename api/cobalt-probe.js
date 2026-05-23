export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const tunnelUrl = url.searchParams.get('url');

  if (!tunnelUrl) {
    return Response.json({ ok: false, reason: 'Missing url param' }, {
      status: 400,
      headers: corsHeaders(),
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstreamHeaders = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/'
    };

    const upstream = await fetch(tunnelUrl, { signal: controller.signal, headers: upstreamHeaders });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return Response.json({ ok: false, reason: `HTTP ${upstream.status}` }, {
        headers: corsHeaders(),
      });
    }

    const contentLength = upstream.headers.get('content-length');
    const estLength = upstream.headers.get('estimated-content-length');

    if (contentLength === '0' || estLength === '0') {
      return Response.json({ ok: false, reason: '0 bytes' }, {
        headers: corsHeaders(),
      });
    }

    // Read first chunk to verify there's real data
    const reader = upstream.body.getReader();
    const { done, value } = await reader.read();
    reader.releaseLock();

    const hasData = !done && value && value.length > 0;

    return Response.json({ ok: hasData, size: hasData ? value.length : 0 }, {
      headers: corsHeaders(),
    });
  } catch (err) {
    return Response.json({ ok: false, reason: err.message }, {
      headers: corsHeaders(),
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
