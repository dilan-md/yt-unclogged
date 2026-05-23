export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return Response.json({ ok: false }, { status: 400, headers: corsHeaders() });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const upstream = await fetch(`${target}/api/serverInfo`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return Response.json({ ok: false }, { headers: corsHeaders() });
    }

    const data = await upstream.json();
    return Response.json({ ok: true, data }, { headers: corsHeaders() });
  } catch (err) {
    return Response.json({ ok: false }, { headers: corsHeaders() });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}
