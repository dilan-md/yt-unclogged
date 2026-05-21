// Test HLS mode specifically on videos that fail with error.api.youtube.login
// The hypothesis: youtubeHLS bypasses the signature/login block

async function testHLS(name, apiUrl, videoUrl, useHLS) {
    const requestData = {
        url: videoUrl,
        filenameStyle: 'basic',
        downloadMode: 'auto',
        videoQuality: '720',
        youtubeHLS: useHLS
    };

    const label = `${name} [HLS:${useHLS}] [${videoUrl.split('v=')[1]}]`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

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
        
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (_) {
            console.log(`${label} => NON-JSON: ${text.slice(0, 100)}`);
            return;
        }
        
        if (data.status === 'error') {
            console.log(`${label} => ❌ ${data.error?.code || JSON.stringify(data.error)}`);
            return;
        }
        
        if (data.url) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 10000);
            const mediaRes = await fetch(data.url, { signal: ctrl2.signal });
            clearTimeout(t2);
            
            const cl = mediaRes.headers.get('content-length');
            const ecl = mediaRes.headers.get('estimated-content-length');
            
            const reader = mediaRes.body.getReader();
            const { done, value } = await reader.read();
            reader.releaseLock();
            ctrl2.abort();
            
            const bytes = value ? value.length : 0;
            if (bytes > 0) {
                console.log(`${label} => ✅ WORKING (${bytes} bytes, CL=${cl}, ECL=${ecl})`);
            } else {
                console.log(`${label} => ❌ 0 BYTES (CL=${cl}, ECL=${ecl})`);
            }
        } else {
            console.log(`${label} => status=${data.status}, no URL`);
        }
    } catch (err) {
        console.log(`${label} => ❌ ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
    }
}

async function run() {
    // Videos that fail with youtube.login on standard mode
    const videos = [
        'https://www.youtube.com/watch?v=kJQP7kiw5Fk',  // Despacito
        'https://www.youtube.com/watch?v=jNQXAC9IVRw',  // Me at the zoo
        'https://www.youtube.com/watch?v=9bZkp7q19f0',  // Gangnam Style
    ];
    
    // Only test servers that are confirmed working (not 0-byte)
    const instances = [
        ['Blackcat',    'https://api.cobalt.blackcat.sweeux.org/'],
        ['CjsNz',      'https://cobaltapi.cjs.nz/'],
        ['FoxKittyCat', 'https://fox.kittycat.boo/'],
    ];
    
    console.log('=== Testing youtubeHLS: false vs true on youtube.login-blocked videos ===\n');
    
    for (const [name, url] of instances) {
        for (const ytUrl of videos) {
            await testHLS(name, url, ytUrl, false);
            await testHLS(name, url, ytUrl, true);
            console.log('');
        }
    }
}

run();
