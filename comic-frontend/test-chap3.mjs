import fs from 'fs';
import * as cheerio from 'cheerio';

async function checkPagination() {
    const rawHtml = await (await fetch('https://damconuong.blog/')).text();
    const $ = cheerio.load(rawHtml);
    const links = [];
    $('a[href^="https://damconuong.blog/truyen/"]').each((i, el) => {
        links.push($(el).attr('href'));
    });
    
    if (links.length > 0) {
        let url = links[0];
        console.log("Checking:", url);
        const detailHtml = await (await fetch(url)).text();
        const $ch = cheerio.load(detailHtml);
        
        console.log("Has pagination?", $ch('.pagination').length > 0 || $ch('[wire\\:click]').length > 0);
        console.log("Livewire elements:", $ch('[wire\\:id]').length);
        console.log("Any script with chapters?", detailHtml.includes('chapters":') || detailHtml.includes('list_chapter'));
        
        // Let's count total physical <a> tags linking to chapters
        let chapterLinks = [];
        $ch('a').each((i, el) => {
           let href = $ch(el).attr('href');
           if (href && href.includes('/chapter-') || href && href.includes('/chap-') || href && href.includes('/chuong-')) {
               chapterLinks.push(href);
           }
        });
        
        console.log("Actual chapter links in DOM:", [...new Set(chapterLinks)].length);
    }
}
checkPagination();
