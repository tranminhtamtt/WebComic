import fs from 'fs';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://damconuong.com'; // User có thể đổi lại domain chính của Dâm Cô Nương
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
    // TODO: Sửa selector lấy truyện theo đúng HTML của web dâm cô nương (nếu có trang chủ)
    const html = await fetchHtml(`${BASE_URL}/`);
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

export async function scrapeComicDetail(comicUrl) {
    console.log(`[+] Scraping detail for ${comicUrl}...`);
    const html = await fetchHtml(comicUrl);
    const $ = cheerio.load(html);

    // TODO: Selector lấy info tác giả/mô tả của DCN
    const author = 'Đang cập nhật';
    const description = 'Đang cập nhật';
    let coverUrl = '';

    const titleMatch = $('title').text().trim() || 'Comic Title';
    
    const chapters = [];
    // TODO: Selector lấy list chapter của DCN
    $('.list-chapter li a').slice(0, 3).each((i, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        let chapterNumber = 1000 - i;
        const match = title.match(/Chapter\s*([\d.]+)/i) || title.match(/Chap\s*([\d.]+)/i);
        if (match && match[1]) {
            chapterNumber = parseFloat(match[1]);
        }
        chapters.push({
            title,
            chapterNumber,
            url: url && !url.startsWith('http') ? BASE_URL + url : url
        });
    });

    console.log(`    - Found ${chapters.length} chapters.`);
    
    for (const chapter of chapters) {
        console.log(`    - Scraping images for ${chapter.title}...`);
        const chHtml = await fetchHtml(chapter.url);
        const $ch = cheerio.load(chHtml);
        const imageUrls = [];
        
        // Lọc kỹ ảnh chapter. Lấy TẤT CẢ thẻ img trong chapter-content (kể cả không có class)
        $ch('#chapter-content img').each((i, el) => {
            // Web sử dụng lazy-load, check tất cả các data-* attribute chứa link
            let src = $ch(el).attr('data-src') || $ch(el).attr('data-original') || $ch(el).attr('src');
            
            // Đôi khi ảnh bị giấu ở attr lạ, ta duyệt hết thuộc tính tìm link http nếu src vẫn rỗng
            if (!src || src.startsWith('data:image')) {
                const attrs = el.attribs || {};
                for (let key in attrs) {
                    if (attrs[key] && attrs[key].trim().startsWith('http')) {
                        src = attrs[key];
                        break;
                    }
                }
            }

            // Loại bỏ các placeholder base64/SVG của lazy content
            if (src && !src.startsWith('data:image')) {
                src = src.trim(); // Bắt buộc trim() vì html thỉnh thoảng có \n cuối link
                if (src.startsWith('//')) src = 'https:' + src;
                if (!imageUrls.includes(src)) imageUrls.push(src);
            }
        });
        
        // CỨU CÁNH (FALLBACK BÁ ĐẠO): NẾU CHỈ LẤY ĐƯỢC 1 ẢNH
        // Lý do: Các ảnh còn lại có thể bị trang web mã hoá đưa vào <script> hoặc <noscript> trên server-side gốc.
        if (imageUrls.length <= 1) {
            console.log("      ! Chỉ tìm được <= 1 ảnh qua DOM. Kích hoạt Extract Regex sâu...");
            const rawHtmlContent = chHtml; // BẮT BUỘC quét toàn bộ Raw HTML để tìm trong các thẻ <script>
            // Quét tìm tất cả link ảnh jpg, png, webp... lẩn khuất trong raw document
            const regexStr = /(https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp))/gi;
            let match;
            while ((match = regexStr.exec(rawHtmlContent)) !== null) {
                let parsed = match[1].trim();
                // Bỏ qua các icon / logo thường gặp
                if (!parsed.includes('/icon') && !parsed.includes('logo') && !imageUrls.includes(parsed)) {
                    imageUrls.push(parsed);
                }
            }
        }
        
        console.log(`      => Extracted ${imageUrls.length} actual images.`);
        chapter.imageUrls = imageUrls;
        await new Promise(r => setTimeout(r, 500)); // Be nice
    }

    return {
        title: titleMatch,
        slug: titleMatch.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        coverUrl,
        description,
        author,
        isAdult: true, // Vì là Truyện dâm cô nương
        chapters: chapters.reverse() 
    };
}
