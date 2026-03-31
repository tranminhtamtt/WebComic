// src/services/scraperService.js

/**
 * Cào danh sách truyện mới cập nhật từ Otruyen API
 */
export const scrapeComicList = async (type = 'latest') => {
    try {
        let endpoint = 'https://otruyenapi.com/v1/api/danh-sach/truyen-moi';
        if (type === 'hot') {
            endpoint = 'https://otruyenapi.com/v1/api/danh-sach/dang-phat-hanh';
        } else if (type === 'completed') {
            endpoint = 'https://otruyenapi.com/v1/api/danh-sach/hoan-thanh';
        }
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        
        const comics = [];
        const domainCdn = data.data.APP_DOMAIN_CDN_IMAGE; // vd: https://img.otruyenapi.com
        
        data.data.items.forEach(item => {
            comics.push({
                title: item.name,
                url: item.slug, // Truyền slug thay url gốc
                coverUrl: `${domainCdn}/uploads/comics/${item.thumb_url}`,
                latestChapter: 'Mới cập nhật'
            });
        });
        
        return comics.slice(0, 30);
    } catch (error) {
        console.error("Error fetching list: ", error);
        throw error;
    }
};

/**
 * Tìm kiếm truyện mới từ Otruyen API
 * @param {string} keyword
 */
export const searchComic = async (keyword) => {
    try {
        const response = await fetch(`https://otruyenapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        
        const comics = [];
        const domainCdn = data.data.APP_DOMAIN_CDN_IMAGE || 'https://img.otruyenapi.com';
        
        if (data.data.items) {
            data.data.items.forEach(item => {
                comics.push({
                    title: item.name,
                    url: item.slug, // Truyền slug thay url
                    coverUrl: `${domainCdn}/uploads/comics/${item.thumb_url}`,
                    latestChapter: 'Kết quả tìm kiếm'
                });
            });
        }
        
        return comics.slice(0, 30);
    } catch (error) {
        console.error("Error searching comic: ", error);
        throw error;
    }
};

/**
 * Lấy chi tiết truyện và danh sách chapter qua API
 * @param {string} slug 
 */
export const scrapeComicDetail = async (slug) => {
    try {
        const response = await fetch(`https://otruyenapi.com/v1/api/truyen-tranh/${slug}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const json = await response.json();
        const doc = json.data.item;
        
        const title = doc.name;
        const author = (doc.author && doc.author.length > 0) ? doc.author.join(', ') : 'Đang cập nhật';
        const description = doc.content ? doc.content.replace(/<[^>]+>/g, '') : '';
        const domainCdn = json.data.seoOnPage?.seoSchema?.image?.replace(`/uploads/comics/${doc.thumb_url}`, '') || 'https://img.otruyenapi.com';
        
        let coverUrl = `${domainCdn}/uploads/comics/${doc.thumb_url}`;

        const chapters = [];
        // Otruyen có thể có nhiều server, lấy server đầu tiên
        if (doc.chapters && doc.chapters.length > 0) {
            const serverData = doc.chapters[0].server_data;
            serverData.forEach((ch, idx) => {
                chapters.push({
                    title: `Chapter ${ch.chapter_name}`,
                    chapterNumber: parseFloat(ch.chapter_name) || (idx + 1),
                    url: ch.chapter_api_data // Trả về url API của chapter để scrapeChapterImages dùng
                });
            });
        }

        // Sắp xếp chapter tăng dần cho Database
        chapters.sort((a,b) => a.chapterNumber - b.chapterNumber);

        return {
            title,
            coverUrl,
            author,
            description,
            chapters
        };
    } catch (error) {
        console.error("Error fetching detail: ", error);
        throw error;
    }
};

/**
 * Lấy danh sách ảnh của 1 chapter qua API
 * @param {string} chapterApiUrl 
 */
export const scrapeChapterImages = async (chapterApiUrl) => {
    try {
        const response = await fetch(chapterApiUrl);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        
        const cdn = data.data.domain_cdn;
        const chPath = data.data.item.chapter_path;
        
        const images = [];
        data.data.item.chapter_image.forEach(img => {
            images.push(`${cdn}/${chPath}/${img.image_file}`);
        });

        return images;
    } catch (error) {
        console.error("Error fetching images: ", error);
        throw error;
    }
};
