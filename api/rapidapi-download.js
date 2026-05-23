export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');
  const quality = url.searchParams.get('quality') || '720';

  if (!videoId) {
    return new Response(JSON.stringify({ message: 'Missing videoId' }), { status: 400, headers: corsHeaders() });
  }

  const rapidApiKey = request.headers.get('x-rapidapi-key') || url.searchParams.get('key');
  if (!rapidApiKey) {
    return new Response(JSON.stringify({ message: 'Missing RapidAPI key' }), { status: 401, headers: corsHeaders() });
  }

  const targetUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${encodeURIComponent(videoId)}`;

  try {
    // Step 1: Get Video details from RapidAPI (binds to current Edge IP)
    const apiRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
      },
    });

    if (!apiRes.ok) {
      return new Response(JSON.stringify({ message: 'RapidAPI fetch failed' }), { status: apiRes.status, headers: corsHeaders() });
    }

    const rapidData = await apiRes.json();
    
    const format = url.searchParams.get('format') || 'mp4';
    let streamUrl = null;

    if (format === 'mp3') {
      if (!rapidData.audios || !rapidData.audios.items || rapidData.audios.items.length === 0) {
        return new Response(JSON.stringify({ message: 'No audio streams found' }), { status: 404, headers: corsHeaders() });
      }
      streamUrl = rapidData.audios.items[0].url;
    } else {
      if (!rapidData.videos || !rapidData.videos.items || rapidData.videos.items.length === 0) {
         return new Response(JSON.stringify({ message: 'No video streams found' }), { status: 404, headers: corsHeaders() });
      }

      let videoItem = rapidData.videos.items.find(v => v.quality === quality + 'p' && v.hasAudio);
      if (!videoItem) {
          videoItem = rapidData.videos.items.find(v => v.hasAudio) || rapidData.videos.items[0];
      }
      streamUrl = videoItem.url;
    }

    if (!streamUrl) {
       return new Response(JSON.stringify({ message: 'Invalid stream URL' }), { status: 404, headers: corsHeaders() });
    }

    // Step 3: Stream the video immediately from the SAME Edge IP
    const upstreamHeaders = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 502, headers: corsHeaders() });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-rapidapi-key, x-rapidapi-host',
  };
}
