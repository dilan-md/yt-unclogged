async function testUserAgent(url, videoUrl, userAgent) {
    console.log(`\nTesting with User-Agent: ${userAgent}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': userAgent
            },
            body: JSON.stringify({
                url: videoUrl,
                filenameStyle: 'basic',
                downloadMode: 'auto',
                videoQuality: '720',
                youtubeHLS: true
            })
        });
        
        console.log(`POST status: ${res.status}`);
        const data = await res.json();
        if (data.status === 'error') {
            console.log(`ERROR: ${data.error?.code}`);
        } else if (data.url) {
            console.log(`SUCCESS! URL: ${data.url.slice(0, 50)}...`);
            const mediaRes = await fetch(data.url);
            const cl = mediaRes.headers.get('content-length');
            console.log(`Content-Length: ${cl}`);
        }
    } catch (e) {
        console.log(`Catch error: ${e.message}`);
    }
}

async function run() {
    const url = 'https://api.cobalt.blackcat.sweeux.org/';
    const video = 'https://www.youtube.com/watch?v=kJQP7kiw5Fk'; // Despacito
    
    await testUserAgent(url, video, 'node');
    await testUserAgent(url, video, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await testUserAgent(url, video, 'Cobalt/1.0');
}
run();
