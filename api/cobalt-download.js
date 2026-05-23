export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const tunnelUrl = url.searchParams.get('url');

  if (!tunnelUrl) {
    return new Response(JSON.stringify({ error: 'Missing url param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    const upstream = await fetch(tunnelUrl);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    let contentDisposition = upstream.headers.get('content-disposition') || '';

    // Ensure it triggers download attachment
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

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // Stream the response body directly
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
