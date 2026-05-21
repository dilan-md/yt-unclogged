// Find Cobalt instances that have YouTube cookies configured
// These are the ONLY ones that can download most YouTube videos

async function findInstances() {
    const sources = [
        'https://instances.cobalt.best/api/instances.json',
        'https://raw.githubusercontent.com/lostdusty/cobalt-instances/main/instances.json'
    ];
    
    for (const source of sources) {
        console.log(`\n=== Trying ${source} ===`);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(source, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeout);
            
            if (!res.ok) {
                console.log(`HTTP ${res.status}`);
                continue;
            }
            
            const data = await res.json();
            console.log(`Total instances: ${data.length}`);
            
            // Show all instances with their properties
            for (const inst of data) {
                const api = inst.apiUrl || inst.api || inst.url || '';
                const name = inst.name || inst.frontend || api;
                const score = inst.scorePct || inst.score || 'N/A';
                const services = inst.services || [];
                const hasCookies = inst.hasCookies || inst.cookies || false;
                const trust = inst.trust || 'N/A';
                
                // Log all YouTube-relevant info
                if (api && (score === 'N/A' || score > 50)) {
                    console.log(`${name} | API: ${api} | Score: ${score} | Cookies: ${JSON.stringify(hasCookies)} | Trust: ${trust} | Services: ${JSON.stringify(services)}`);
                }
            }
        } catch (err) {
            console.log(`Failed: ${err.message}`);
        }
    }

    // Also try directly testing a wider set of known instances with a "hard" video
    console.log('\n=== Direct test of additional instances with Despacito (hard video) ===');
    
    const extraInstances = [
        'https://cobalt.canine.tools/',
        'https://api.cobalt.tools/',
        'https://co.eepy.today/',
        'https://cobalt.aether.lol/',
        'https://dl.khyernet.xyz/',
        'https://cobalt.popcat.xyz/',
        'https://api.co.wuk.sh/',
    ];
    
    for (const apiUrl of extraInstances) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
                    filenameStyle: 'basic',
                    downloadMode: 'auto',
                    videoQuality: '720',
                    youtubeHLS: false
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch(_) {
                console.log(`${apiUrl} => Non-JSON (${res.status})`);
                continue;
            }
            
            if (data.status === 'error') {
                const code = data.error?.code || JSON.stringify(data.error);
                console.log(`${apiUrl} => ❌ ${code}`);
                continue;
            }
            
            if (data.url) {
                // Quick probe
                const ctrl2 = new AbortController();
                const t2 = setTimeout(() => ctrl2.abort(), 8000);
                const mediaRes = await fetch(data.url, { signal: ctrl2.signal });
                clearTimeout(t2);
                const reader = mediaRes.body.getReader();
                const { value } = await reader.read();
                reader.releaseLock();
                ctrl2.abort();
                const bytes = value ? value.length : 0;
                console.log(`${apiUrl} => ${bytes > 0 ? '✅ WORKING!' : '❌ 0 bytes'} (${data.status})`);
            } else {
                console.log(`${apiUrl} => status=${data.status}, no URL`);
            }
        } catch (err) {
            console.log(`${apiUrl} => ❌ ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
        }
    }
}

findInstances();
