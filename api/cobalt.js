export const config = { runtime: 'edge' };

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  const targetUrl = request.headers.get('x-cobalt-target');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing X-Cobalt-Target header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    const body = await request.text();

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const auth = request.headers.get('authorization');
    if (auth) {
      headers['Authorization'] = auth;
    }

    const cobaltRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    const responseBody = await cobaltRes.text();

    return new Response(responseBody, {
      status: cobaltRes.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Cobalt-Target, Authorization',
  };
}
