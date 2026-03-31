import fs from 'fs';
import * as cheerio from 'cheerio';

async function testChapters() {
    const rawHtml = await (await fetch('https://damconuong.blog/')).text();
    const $ = cheerio.load(rawHtml);
    const links = [];
    $('a[href^="https://damconuong.blog/truyen/"]').each((i, el) => {
        links.push($(el).attr('href'));
    });
    
    const unique = [...new Set(links)];
    console.log("Found links:", unique.slice(0, 3));
    
    if (unique.length > 0) {
        const url = unique[0];
        console.log("Testing chapters for:", url);
        const detailHtml = await (await fetch(url)).text();
        const safeUrlPattern = url.replace(/\//g, '\\/');
        const regexPattern = new RegExp(`href=\\\\?["'](${safeUrlPattern}/(?:chapter|chuong|chap)-?(\\d+(?:\\.\\d+)?))\\\\?["']`, 'gi');
        
        const chapters = new Set();
        let m;
        while((m = regexPattern.exec(detailHtml)) !== null) {
            chapters.add(m[1]);
        }
        
        console.log(`Found ${chapters.size} unique chapters via regex`);
        if (chapters.size < 5) {
            console.log("WARNING: Regex failed or only few chapters.");
            const $ch = cheerio.load(detailHtml);
            const domChaps = [];
            $ch('a').each((i, el) => {
               if ($(el).attr('href') && $(el).attr('href').includes('/chapter')) {
                   domChaps.push($(el).attr('href'));
               }
            });
            console.log("DOM found chapter links:", domChaps.length, domChaps.slice(0, 3));
        }
    }
}

testChapters();
