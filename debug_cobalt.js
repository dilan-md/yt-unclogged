async function testInstance(apiUrl, videoUrl) {
    const requestData = {
        url: videoUrl,
        filenameStyle: 'basic',
        downloadMode: 'auto',
        videoQuality: '720'
    };

    try {
        console.log(`\nTesting ${apiUrl} with ${videoUrl}...`);
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (data.url) {
            console.log('Fetching tunnel/redirect URL...');
            const mediaRes = await fetch(data.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            console.log(`Media Status: ${mediaRes.status}`);
            console.log(`Content-Length: ${mediaRes.headers.get('content-length')}`);
            console.log(`Content-Type: ${mediaRes.headers.get('content-type')}`);
            
            // Read first chunk
            const reader = mediaRes.body.getReader();
            const { value } = await reader.read();
            console.log(`First chunk received: ${value ? value.length : 0} bytes`);
        }
    } catch (err) {
        console.error('Error testing:', err.message);
    }
}

async function run() {
    await testInstance('https://cobaltapi.kittycat.boo/', 'https://vimeo.com/100007052');
}

run();
