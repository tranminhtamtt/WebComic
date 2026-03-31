import fs from 'fs';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://nettruyen.work';
const API_URL = 'http://localhost:8080/api/admin/import-comic';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
};

async function fetchHtml(url) {
    const res = await fetch(url.startsWith('//') ? 'https:' + url : url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status} on ${url}`);
    return res.text();
}

async function scrapeComicList() {
    console.log("Fetching home page...");
    const html = await fetchHtml(`${BASE_URL}/trang-chu`);
    const $ = cheerio.load(html);
    const comics = [];
    $('.item').slice(0, 5).each((i, el) => {
        const titleEl = $(el).find('h3 a');
        if (titleEl.length) {
            let url = titleEl.attr('href');
            if (url && !url.startsWith('http')) {
                url = BASE_URL + (url.startsWith('/') ? '' : '/') + url;
            }
            comics.push({
                title: titleEl.text().trim(),
                url: url
            });
        }
    });
    return comics;
}

async function scrapeComicDetail(comic) {
    console.log(`[+] Scraping detail for ${comic.title}...`);
    const html = await fetchHtml(comic.url);
    const $ = cheerio.load(html);

    const author = $('.author .col-xs-8').text().trim() || 'Đang cập nhật';
    const description = $('.detail-content p').text().trim() || '';
    let coverUrl = $('.col-image img').attr('src') || '';
    if (coverUrl.startsWith('//')) coverUrl = 'https:' + coverUrl;

    const chapters = [];
    // Only scrape latest 3 chapters to speed up
    $('.list-chapter li.row').slice(0, 3).each((i, el) => {
        const link = $(el).find('.chapter a');
        if (link.length) {
            const title = link.text().trim();
            const url = link.attr('href');
            let chapterNumber = 1000 - i; // Fallback unique temporary number
            const match = title.match(/Chapter\s*([\d.]+)/i) || title.match(/Chap\s*([\d.]+)/i);
            if (match && match[1]) {
                chapterNumber = parseFloat(match[1]);
            }
            chapters.push({
                title,
                chapterNumber,
                url: url && !url.startsWith('http') ? BASE_URL + url : url
            });
        }
    });

    console.log(`    - Found ${chapters.length} chapters.`);
    
    for (const chapter of chapters) {
        console.log(`    - Scraping images for ${chapter.title}...`);
        const chHtml = await fetchHtml(chapter.url);
        const $ch = cheerio.load(chHtml);
        const imageUrls = [];
        $ch('.page-chapter img').each((i, el) => {
            let src = $(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('src');
            if (src) {
                if (src.startsWith('//')) src = 'https:' + src;
                imageUrls.push(src);
            }
        });
        chapter.imageUrls = imageUrls;
        await new Promise(r => setTimeout(r, 500)); // Be nice
    }

    return {
        title: comic.title,
        slug: comic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        coverUrl,
        description,
        author,
        isAdult: false,
        chapters: chapters.reverse() // Sort ascending
    };
}

async function start() {
    try {
        const list = await scrapeComicList();
        
        for (const comic of list) {
            const data = await scrapeComicDetail(comic);
            
            console.log(`[+] Sending ${data.title} to database...`);
            const postRes = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await postRes.json();
            if (result.success) {
                console.log(`[V] Successfully saved ${data.title} to DB.`);
            } else {
                console.error(`[X] Error saving ${data.title}:`, result.message);
            }
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log("Done!");
    } catch(e) {
        console.error("Script Error:", e);
    }
}

start();
