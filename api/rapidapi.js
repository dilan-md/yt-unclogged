export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');

  if (!videoId) {
    return Response.json({ message: 'Missing videoId parameter' }, {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const rapidApiKey = request.headers.get('x-rapidapi-key');
  if (!rapidApiKey) {
    return Response.json({ message: 'Missing RapidAPI key' }, {
      status: 401,
      headers: corsHeaders(),
    });
  }

  const targetUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${encodeURIComponent(videoId)}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
      },
    });

    const data = await upstream.json();

    return Response.json(data, {
      status: upstream.status,
      headers: corsHeaders(),
    });
  } catch (err) {
    return Response.json({ message: err.message }, {
      status: 502,
      headers: corsHeaders(),
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-rapidapi-key, x-rapidapi-host',
  };
}
