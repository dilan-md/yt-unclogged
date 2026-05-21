async function run() {
    const apiUrl = 'https://cobaltapi.squair.xyz/';
    const requestData = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        filenameStyle: 'basic',
        downloadMode: 'auto',
        videoQuality: '720'
    };

    try {
        console.log(`Sending POST to ${apiUrl}...`);
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await res.json();
        console.log('POST Response:', data);
        
        if (data.url) {
            console.log('Sending GET to tunnel URL...');
            const mediaRes = await fetch(data.url);
            console.log('GET Status:', mediaRes.status);
            console.log('GET Headers:');
            for (const [key, val] of mediaRes.headers.entries()) {
                console.log(`  ${key}: ${val}`);
            }
            
            const buffer = await mediaRes.arrayBuffer();
            console.log(`Downloaded bytes: ${buffer.byteLength}`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
