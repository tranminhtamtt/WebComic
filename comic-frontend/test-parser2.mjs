import * as cheerio from 'cheerio';
import fs from 'fs';

const chHtml = `
<div class="text-center -mx-3" id="chapter-content">
                    <div class="ads-wrapper text-center">
                    </div>
                                                                        
                            <img class="chapter-img max-w-full my-0 mx-auto" src="https://dcnvn2.mbpro.vip/dcn/33181c92-48e4-41e4-b88a-d1addc2e83e0/a48a5f23-1f96-4080-a141-c3938b06b478/1.jpg
" data-index="0" fetchpriority="high" decoding="async" alt="Tân Thế Giới Tuyệt Vời Chapter 1 - Trang 1 - Dâm Cô Nương">
                                                                                                
                            <img class="chapter-img max-w-full my-0 mx-auto" src="https://dcnvn2.mbpro.vip/dcn/33181c92-48e4-41e4-b88a-d1addc2e83e0/a48a5f23-1f96-4080-a141-c3938b06b478/2.jpg
" data-index="1" fetchpriority="high" decoding="async" alt="Tân Thế Giới Tuyệt Vời Chapter 1 - Trang 2 - Dâm Cô Nương">
                                                                                                
                            <img class="chapter-img lazy max-w-full my-0 mx-auto" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" data-src="https://dcnvn2.mbpro.vip/dcn/33181c92-48e4-41e4-b88a-d1addc2e83e0/a48a5f23-1f96-4080-a141-c3938b06b478/3.jpg
" data-index="2" decoding="async" alt="Tân Thế Giới Tuyệt Vời Chapter 1 - Trang 3 - Dâm Cô Nương">
                                                                                                
                            <img class="chapter-img lazy max-w-full my-0 mx-auto" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" data-src="https://dcnvn2.mbpro.vip/dcn/33181c92-48e4-41e4-b88a-d1addc2e83e0/a48a5f23-1f96-4080-a141-c3938b06b478/4.jpg
" data-index="3" decoding="async" alt="Tân Thế Giới Tuyệt Vời Chapter 1 - Trang 4 - Dâm Cô Nương">
</div>`;

const $ch = cheerio.load(chHtml);
const imageUrls = [];

$ch('#chapter-content .chapter-img').each((i, el) => {
    let src = $ch(el).attr('data-src') || $ch(el).attr('data-original') || $ch(el).attr('src');
    
    if (!src || src.startsWith('data:image')) {
        const attrs = el.attribs || {};
        for (let key in attrs) {
            if (attrs[key] && attrs[key].trim().startsWith('http')) {
                src = attrs[key];
                break;
            }
        }
    }

    if (src && !src.startsWith('data:image')) {
        src = src.trim();
        if (src.startsWith('//')) src = 'https:' + src;
        if (!imageUrls.includes(src)) imageUrls.push(src);
    }
});

console.log("DOM extraction got:", imageUrls);

if (imageUrls.length <= 1) {
    console.log("Fallback Regex running...");
    const rawHtmlContent = chHtml;
    const regexStr = /(https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp))/gi;
    let match;
    while ((match = regexStr.exec(rawHtmlContent)) !== null) {
        let parsed = match[1].trim();
        if (!parsed.includes('/icon') && !parsed.includes('logo') && !imageUrls.includes(parsed)) {
            imageUrls.push(parsed);
        }
    }
}

console.log("Final extraction length:", imageUrls.length);
console.log(imageUrls);
