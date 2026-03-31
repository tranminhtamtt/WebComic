// src/services/mangadexService.js

const BASE_URL = 'https://api.mangadex.org';
const UPLOADS_URL = 'https://uploads.mangadex.org';

/**
 * Trích xuất ảnh bìa từ danh sách relationships của 1 manga
 */
const getCoverUrl = (mangaId, relationships) => {
    const coverRel = relationships?.find(rel => rel.type === 'cover_art');
    if (coverRel && coverRel.attributes && coverRel.attributes.fileName) {
        // file 256.jpg for smaller thumbnail, or original
        return `${UPLOADS_URL}/covers/${mangaId}/${coverRel.attributes.fileName}.512.jpg`;
    }
    return 'https://mangadex.org/img/avatar.png'; // fallback
};

/**
 * Láy danh sách truyện tiếng Anh mới nhất (Cập nhật gần đây)
 */
export const scrapeComicList = async (type = 'latest') => {
    try {
        // Lấy danh sách manga mới cập nhật (có ảnh bìa) với ngôn ngữ gốc tiếng Nhật/Hàn/Trung, đã đc dịch sang Eng.
        // Nhưng đơn giản nhất là lấy list manga ngẫu nhiên hoặc mới nhất hỗ trợ tiếng Anh
        let order = 'order[updatedAt]=desc';
        if (type === 'hot') {
            order = 'order[followedCount]=desc';
        } else if (type === 'completed') {
            order = 'order[updatedAt]=desc&status[]=completed';
        }
        const response = await fetch(`${BASE_URL}/manga?includes[]=cover_art&availableTranslatedLanguage[]=en&${order}&limit=30`);
        if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
        const json = await response.json();
        
        const comics = [];
        if (json.data) {
            json.data.forEach(item => {
                const title = item.attributes.title.en || Object.values(item.attributes.title)[0] || 'Unknown Title';
                comics.push({
                    title: title,
                    url: item.id, // Dùng ID làm URL để cào detail
                    coverUrl: getCoverUrl(item.id, item.relationships),
                    latestChapter: 'Mới cập nhật (EN)'
                });
            });
        }
        return comics;
    } catch (error) {
        console.error("MangaDex fetch list error:", error);
        throw error;
    }
};

/**
 * Tìm kiếm truyện tiếng Anh trên MangaDex
 * @param {string} keyword 
 */
export const searchComic = async (keyword) => {
    try {
        const response = await fetch(`${BASE_URL}/manga?title=${encodeURIComponent(keyword)}&includes[]=cover_art&availableTranslatedLanguage[]=en&limit=30`);
        if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
        const json = await response.json();
        
        const comics = [];
        if (json.data) {
            json.data.forEach(item => {
                const title = item.attributes.title.en || Object.values(item.attributes.title)[0] || 'Unknown Title';
                comics.push({
                    title: title,
                    url: item.id,
                    coverUrl: getCoverUrl(item.id, item.relationships),
                    latestChapter: 'Kết quả tìm kiếm'
                });
            });
        }
        return comics;
    } catch (error) {
        console.error("MangaDex search error:", error);
        throw error;
    }
};

/**
 * Lấy chi tiết truyện và danh sách các chapter tiếng Anh (English)
 * @param {string} mangaId 
 */
export const scrapeComicDetail = async (mangaId) => {
    try {
        // 1. Lấy Full thông tin truyện (Author, Cover)
        const mangaRes = await fetch(`${BASE_URL}/manga/${mangaId}?includes[]=cover_art&includes[]=author`);
        if (!mangaRes.ok) throw new Error(`MangaDex API error: ${mangaRes.status}`);
        const mangaJson = await mangaRes.json();
        const mangaData = mangaJson.data;

        const title = mangaData.attributes.title.en || Object.values(mangaData.attributes.title)[0] || 'Unknown';
        const description = mangaData.attributes.description.en || Object.values(mangaData.attributes.description)[0] || 'No description available.';
        const coverUrl = getCoverUrl(mangaData.id, mangaData.relationships);
        
        const authorRel = mangaData.relationships.find(rel => rel.type === 'author');
        const author = authorRel && authorRel.attributes ? authorRel.attributes.name : 'Đang cập nhật';

        // 2. Lấy danh sách Chapters (Chỉ lấy bản tiếng Anh)
        // Giới hạn 500 do API MangaDex phân trang, với truyện cực lớn thì gọi nhiều trang (ở đây ta demo 1 trang đầu hoặc max 500)
        const chapterRes = await fetch(`${BASE_URL}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500`);
        if (!chapterRes.ok) throw new Error(`MangaDex API error: ${chapterRes.status}`);
        const chapterJson = await chapterRes.json();

        const chaptersMap = new Map(); // Dùng Map để lọc deduplicate chapter bị up nhiều nhóm dịch khác nhau
        
        if (chapterJson.data) {
            chapterJson.data.forEach(ch => {
                const chapNum = parseFloat(ch.attributes.chapter);
                if (isNaN(chapNum)) return; // Bỏ qua chapter oneshot không có số
                
                // Nếu chưa có chap này, hoặc groups này tốt hơn (MangaDex có nhiều nhóm dịch cùng 1 chap)
                if (!chaptersMap.has(chapNum)) {
                    chaptersMap.set(chapNum, {
                        title: ch.attributes.title ? `Ch. ${chapNum} - ${ch.attributes.title}` : `Chapter ${chapNum}`,
                        chapterNumber: chapNum,
                        url: ch.id // Trả về ID của chapter để lấy ảnh
                    });
                }
            });
        }

        const chapters = Array.from(chaptersMap.values()).sort((a,b) => a.chapterNumber - b.chapterNumber);

        return {
            title,
            coverUrl,
            author,
            description,
            chapters
        };
    } catch (error) {
        console.error("MangaDex detail error:", error);
        throw error;
    }
};

/**
 * Lấy danh sách URL ảnh thật của 1 chapter từ At-Home-Server của MangaDex
 * @param {string} chapterId 
 */
export const scrapeChapterImages = async (chapterId) => {
    try {
        const response = await fetch(`${BASE_URL}/at-home/server/${chapterId}`);
        if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
        const json = await response.json();
        
        const baseUrl = json.baseUrl;
        const hash = json.chapter.hash;
        const dataArr = json.chapter.data; // Mảng tên file ảnh chất lượng cao
        
        // Cấu trúc URL ảnh: {baseUrl}/data/{chapter.hash}/{filename}
        const images = dataArr.map(filename => `${baseUrl}/data/${hash}/${filename}`);
        
        return images;
    } catch (error) {
        console.error("MangaDex images error:", error);
        throw error;
    }
};
