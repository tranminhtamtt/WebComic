import fs from 'fs';

async function testChapters() {
    // testing Tan The Gioi
    const url = 'https://damconuong.blog/truyen/tan-the-gioi-tuyet-voi';
    const rawHtml = await (await fetch(url)).text();
    
    // Simulate java regex
    const safeUrlPattern = url.replace(/\//g, '\\/');
    const regexPattern = new RegExp(`href=\\\\?["'](${safeUrlPattern}/(?:chapter|chuong|chap)-?(\\d+(?:\\.\\d+)?))\\\\?["']`, 'gi');
    
    const chapters = new Set();
    let m;
    while((m = regexPattern.exec(rawHtml)) !== null) {
        chapters.add(m[1]);
    }
    
    console.log(`Found ${chapters.size} unique chapters`);
    console.log("Samples:");
    console.log(Array.from(chapters).slice(0, 5));
    console.log(Array.from(chapters).slice(-5));
}

testChapters();
