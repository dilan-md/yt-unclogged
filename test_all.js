async function testInstance(name, apiUrl, videoUrl) {
    const requestData = {
        url: videoUrl,
        filenameStyle: 'basic',
        downloadMode: 'auto',
        videoQuality: '720',
        youtubeHLS: false
    };

    console.log(`\n===== ${name} (${apiUrl}) [Video: ${videoUrl.split('v=')[1]}] =====`);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        console.log(`POST: ${res.status}`);
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            console.log(`ERROR: Non-JSON response: ${text.slice(0, 150)}`);
            return;
        }
        
        if (data.status === 'error') {
            console.log(`ERROR: ${data.error?.code || JSON.stringify(data.error)}`);
            return;
        }
        
        console.log(`Status: ${data.status}, filename: ${data.filename || 'N/A'}`);
        
        if (data.url) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 8000);
            const mediaRes = await fetch(data.url, { signal: ctrl2.signal });
            clearTimeout(t2);
            
            const cl = mediaRes.headers.get('content-length');
            const ecl = mediaRes.headers.get('estimated-content-length');
            console.log(`Tunnel: status=${mediaRes.status}, CL=${cl}, ECL=${ecl}`);
            
            const reader = mediaRes.body.getReader();
            const { done, value } = await reader.read();
            reader.releaseLock();
            ctrl2.abort();
            
            const bytes = value ? value.length : 0;
            console.log(`First chunk: done=${done}, bytes=${bytes}`);
            console.log(bytes > 0 ? '✅ WORKING' : '❌ BLOCKED (0 bytes)');
        }
    } catch (err) {
        console.log(`❌ FAILED: ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
    }
}

async function run() {
    const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
        'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo (Short standard video)
        'https://www.youtube.com/watch?v=2MpUj-A1uoU'  // Short meme video
    ];
    
    const instances = [
        ['Blackcat',          'https://api.cobalt.blackcat.sweeux.org/'],
        ['LiubquantiClick',   'https://api.cobalt.liubquanti.click/'],
        ['FoxKittyCat',        'https://fox.kittycat.boo/'],
        ['WoofMonster',        'https://api.dl.woof.monster/']
    ];
    
    for (const [name, url] of instances) {
        for (const ytUrl of urls) {
            await testInstance(name, url, ytUrl);
        }
    }
}

run();
