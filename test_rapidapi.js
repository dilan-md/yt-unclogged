async function test() {
    const url = 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=dQw4w9WgXcQ';
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': '79af032004mshfea6d6648d84e89p1edabbjsnecb4ea28e382',
            'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com'
        }
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log('=== VIDEO INFO ===');
        console.log('Title:', data.title);
        console.log('Type:', data.type);
        console.log('ErrorId:', data.errorId);
        
        // Check videos
        if (data.videos) {
            console.log('\n=== VIDEOS (' + data.videos.items?.length + ' items) ===');
            data.videos.items?.slice(0, 5).forEach((v, i) => {
                console.log(`[${i}] quality=${v.quality}, extension=${v.extension}, size=${v.sizeText}, hasAudio=${v.hasAudio}, url=${v.url?.slice(0, 80)}...`);
            });
        }
        
        // Check audios
        if (data.audios) {
            console.log('\n=== AUDIOS (' + data.audios.items?.length + ' items) ===');
            data.audios.items?.slice(0, 5).forEach((a, i) => {
                console.log(`[${i}] quality=${a.quality}, extension=${a.extension}, size=${a.sizeText}, url=${a.url?.slice(0, 80)}...`);
            });
        }
        
        // Print all top-level keys
        console.log('\n=== TOP LEVEL KEYS ===');
        console.log(Object.keys(data));
        
    } catch (error) {
        console.error(error);
    }
}

test();
