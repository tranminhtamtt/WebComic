import fs from 'fs';
import * as cheerio from 'cheerio';

async function diff() {
    const url = 'https://damconuong.blog/truyen/toi-la-ma-ca-rong';
    const detailHtml = await (await fetch(url)).text();
    const safeUrlPattern = url.replace(/\//g, '\\/');
    const regexPattern = new RegExp(`href=\\\\?["'](${safeUrlPattern}/(?:chapter|chuong|chap)[^"']*)`, 'gi');
    
    // My previous strict regex:
    const strictRegex = new RegExp(`href=\\\\?["'](${safeUrlPattern}/(?:chapter|chuong|chap)-?(\\d+(?:\\.\\d+)?))\\\\?["']`, 'gi');
    
    const chapters1 = new Set();
    let m;
    while((m = strictRegex.exec(detailHtml)) !== null) {
        chapters1.add(m[1]);
    }
    
    const chapters2 = new Set();
    let m2;
    while((m2 = regexPattern.exec(detailHtml)) !== null) {
        chapters2.add(m2[1]);
    }
    
    console.log("Strict Regex Found:", chapters1.size);
    console.log("Broad Regex Found:", chapters2.size);
    
    const missed = [...chapters2].filter(x => !chapters1.has(x));
    console.log("Missed chapters:", missed);
}
diff();
