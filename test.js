const urls = [
    'https://nuko-c.meowing.de',
    'https://cobaltapi.kittycat.boo',
    'https://cobaltapi.squair.xyz',
    'https://api.cobalt.blackcat.sweeux.org',
    'https://api.qwkuns.me',
    'https://apicobalt.mgytr.top'
];

const requestData = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    filenameStyle: 'basic',
    downloadMode: 'auto',
    videoQuality: '1080'
};

async function test() {
    for (const u of urls) {
        try {
            const res = await fetch(`${u}/`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            const data = await res.json();
            console.log(u, data);
        } catch(e) {
            console.log(u, 'FAILED');
        }
    }
}
test();
