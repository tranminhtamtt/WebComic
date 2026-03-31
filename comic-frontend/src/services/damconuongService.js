import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL + '/scraper/damconuong';

export const scrapeComicList = async (type = 'latest') => {
    try {
        const response = await axios.get(`${API_BASE}/latest`, { params: { type } });
        return response.data;
    } catch (error) {
        console.error("Damconuong list scraper error", error);
        throw error;
    }
};

export const searchComic = async (query) => {
    try {
        const response = await axios.get(`${API_BASE}/search`, { params: { query } });
        return response.data;
    } catch (error) {
        console.error("Damconuong search error", error);
        throw error;
    }
};

export const scrapeComicDetail = async (comicUrl) => {
    try {
        const response = await axios.get(`${API_BASE}/comic`, { params: { url: comicUrl } });
        return response.data;
    } catch (error) {
        console.error("Damconuong detail scraper error", error);
        throw error;
    }
};

export const scrapeChapterImages = async (chapterUrl) => {
    try {
        const response = await axios.get(`${API_BASE}/chapter`, { params: { url: chapterUrl } });
        return response.data;
    } catch (error) {
        console.error("Damconuong chapter image scraper error", error);
        throw error;
    }
};
