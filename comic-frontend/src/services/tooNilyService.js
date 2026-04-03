import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL + '/scraper/toonily';
// Toonily scraping qua proxy có thể mất tới 2 phút — tăng timeout
const TOONILY_TIMEOUT = 120000;

export const scrapeComicList = async (type = 'latest') => {
    try {
        const response = await axios.get(`${API_BASE}/latest`, {
            params: { type },
            timeout: TOONILY_TIMEOUT
        });
        return response.data;
    } catch (error) {
        console.error("Toonily list scraper error", error);
        throw error;
    }
};

export const searchComic = async (query) => {
    try {
        const response = await axios.get(`${API_BASE}/search`, {
            params: { query },
            timeout: TOONILY_TIMEOUT
        });
        return response.data;
    } catch (error) {
        console.error("Toonily search error", error);
        throw error;
    }
};

export const scrapeComicDetail = async (comicUrl) => {
    try {
        const response = await axios.get(`${API_BASE}/comic`, {
            params: { url: comicUrl },
            timeout: TOONILY_TIMEOUT
        });
        return response.data;
    } catch (error) {
        console.error("Toonily detail scraper error", error);
        throw error;
    }
};

export const scrapeChapterImages = async (chapterUrl) => {
    try {
        const response = await axios.get(`${API_BASE}/chapter`, {
            params: { url: chapterUrl },
            timeout: TOONILY_TIMEOUT
        });
        return response.data;
    } catch (error) {
        console.error("Toonily chapter image scraper error", error);
        throw error;
    }
};
