import * as cheerio from 'cheerio';

const htmlStr = `
<div class="text-center -mx-3" id="chapter-content">
    <div class="ads-wrapper text-center"></div>
    <img class="chapter-img max-w-full my-0 mx-auto" src="https://dcnvn2.mbpro.vip/dcn/1.jpg" data-index="0" fetchpriority="high" decoding="async" alt="1">
    <img class="chapter-img max-w-full my-0 mx-auto" src="https://dcnvn2.mbpro.vip/dcn/2.jpg\n" data-index="1" fetchpriority="high" decoding="async" alt="2">
    <img class="chapter-img lazy max-w-full my-0 mx-auto" src="data:image/svg+xml,%3Csvg..." data-src="https://dcnvn2.mbpro.vip/dcn/3.jpg" data-index="2" decoding="async" alt="3">
    <img class="chapter-img lazy max-w-full my-0 mx-auto" src="data:image/svg+xml,%3Csvg..." data-src="https://dcnvn2.mbpro.vip/dcn/4.jpg\n" data-index="3" decoding="async" alt="4">
</div>
`;

const $ch = cheerio.load(htmlStr);
const imageUrls = [];

$ch('#chapter-content .chapter-img').each((i, el) => {
    let src = $ch(el).attr('data-src') || $ch(el).attr('data-original') || $ch(el).attr('src');
    if (src && !src.startsWith('data:image')) {
        if (src.startsWith('//')) src = 'https:' + src;
        imageUrls.push(src);
    }
});

console.log("Extracted URLs length:", imageUrls.length);
console.log(imageUrls);
