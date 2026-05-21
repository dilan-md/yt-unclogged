async function getInstances() {
    try {
        const res = await fetch('https://instances.cobalt.best/api/instances.json', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        if (res.status !== 200) {
            console.error('Non-200 status, response snippet:', text.slice(0, 300));
            return;
        }
        const data = JSON.parse(text);
        console.log('Instances found:', data.length);
        
        // Filter working, public, HTTPS instances with high scores
        const working = data
            .filter(i => i.scorePct > 80 && i.frontendUrl.startsWith('https://'))
            .map(i => ({ name: i.name, api: i.apiUrl, score: i.scorePct }));
        
        console.log('Top working instances:');
        console.log(JSON.stringify(working, null, 2));
    } catch (err) {
        console.error('Failed to fetch from instances.cobalt.best:', err.message);
    }
}

getInstances();
