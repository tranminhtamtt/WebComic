import fs from 'fs';

const API_IMPORT = 'http://localhost:8080/api/admin/import-comic';
const API_COMICS = 'http://localhost:8080/api/comics';
const OTRUYEN_HOME = 'https://otruyenapi.com/v1/api/home';
const OTRUYEN_COMIC = 'https://otruyenapi.com/v1/api/truyen-tranh/';

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function cleanOldComics() {
    const res = await fetch(API_COMICS);
    const comics = await res.json();
    for (const c of comics) {
        if (c.slug !== 'kagurabachi') {
            console.log(`Deleting ${c.title}...`);
            await fetch(`${API_COMICS}/${c.id}`, { method: 'DELETE' });
        }
    }
}

async function main() {
    try {
        console.log("[+] Cleaning old broken comics...");
        await cleanOldComics();

        console.log(`\n[+] Fetching from Otruyen API...`);
        const homeRes = await fetch(OTRUYEN_HOME);
        const homeData = await homeRes.json();
        
        const topComics = homeData.data.items.slice(0, 5); // get top 5

        for (const item of topComics) {
            console.log(`\n---------------------------------`);
            console.log(`[+] Processing: ${item.name}`);
            
            // Detail
            const detailRes = await fetch(OTRUYEN_COMIC + item.slug);
            const detailData = await detailRes.json();
            const comicInfo = detailData.data.item;

            // Cover
            const coverUrl = `${homeData.data.APP_DOMAIN_CDN_IMAGE}/uploads/comics/${comicInfo.thumb_url}`;
            const description = comicInfo.content ? comicInfo.content.replace(/<[^>]+>/g, '') : '';
            const author = (comicInfo.author && comicInfo.author.length > 0) ? comicInfo.author.join(', ') : 'Đang cập nhật';

            const payload = {
                title: comicInfo.name,
                slug: comicInfo.slug,
                coverUrl: coverUrl,
                description: description,
                author: author,
                isAdult: false,
                chapters: []
            };

            // Limit chapters to first 3 to save time
            const serverData = comicInfo.chapters[0].server_data.slice(-3).reverse(); // latest 3
            
            for (let i = 0; i < serverData.length; i++) {
                const ch = serverData[i];
                console.log(`    - Fetching Chapter ${ch.chapter_name}...`);
                
                try {
                    const chapterRes = await fetch(ch.chapter_api_data);
                    const chapterData = await chapterRes.json();
                    
                    const cdn = chapterData.data.domain_cdn; // e.g., https://sv1.otruyencdn.com
                    const chPath = chapterData.data.item.chapter_path; // e.g., uploads/comics/...
                    
                    const imageUrls = chapterData.data.item.chapter_image.map(img => 
                        `${cdn}/${chPath}/${img.image_file}`
                    );

                    payload.chapters.push({
                        chapterNumber: parseFloat(ch.chapter_name) || (serverData.length - i),
                        title: ch.chapter_name,
                        imageUrls: imageUrls
                    });
                    
                    await delay(300);
                } catch(e) {
                    console.error(`    [!] Error fetching chapter ${ch.chapter_name}:`, e.message);
                }
            }
            
            payload.chapters.reverse(); // Ascending

            console.log(`[+] Sending ${payload.title} to backend...`);
            const postRes = await fetch(API_IMPORT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const postData = await postRes.json();
            if (postData.success) {
                console.log(`[V] Saved ${payload.title}!`);
            } else {
                console.error(`[X] Error saving:`, postData);
            }
            
            await delay(1000);
        }
        console.log("\n[V] All Done!");
    } catch(e) {
        console.error("Script error:", e);
    }
}

main();
