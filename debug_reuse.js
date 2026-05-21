async function run() {
    const apiUrl = 'https://api.cobalt.blackcat.sweeux.org/';
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
            console.log('Fetching tunnel first time (first chunk only)...');
            const mediaRes1 = await fetch(data.url);
            console.log('First fetch status:', mediaRes1.status);
            const reader = mediaRes1.body.getReader();
            const { value } = await reader.read();
            console.log(`First fetch first chunk: ${value ? value.length : 0} bytes`);
            reader.releaseLock();
            
            console.log('Fetching tunnel second time...');
            const mediaRes2 = await fetch(data.url);
            console.log('Second fetch status:', mediaRes2.status);
            const buffer2 = await mediaRes2.arrayBuffer();
            console.log(`Second fetch total bytes: ${buffer2.byteLength}`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
