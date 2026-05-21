const url = 'https://cobaltapi.kittycat.boo/';
const requestData = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    filenameStyle: 'basic',
    downloadMode: 'auto',
    videoQuality: '1080'
};

fetch(url, {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
})
.then(res => res.json())
.then(data => {
    console.log('Tunnel URL:', data.url);
})
.catch(err => console.error('Error:', err));
