const CACHE_EXPIRATION = 1000 * 60 * 5; // 5 phút thời gian sống

/**
 * Hàm lấy dữ liệu với khả năng chống gọi API lại liên tục (Lưu đệm vào Session Storage)
 * Hữu ích cho các màn hình: Home, Chapter, Mangedex, ComicDetail
 */
export const cachedFetch = async (url, options = {}) => {
  // Chỉ lưu đệm cho phương thức GET (hút dữ liệu về)
  const method = options.method || 'GET';
  if (method !== 'GET') {
      return fetch(url, options);
  }

  // Khóa nhận diện
  const cacheKey = `webcomic_cache_${url}`;
  
  // Kiểm tra dữ liệu cũ trong RAM của thẻ (Session Storage)
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
      try {
          const { data, timestamp } = JSON.parse(cachedData);
          // Check xem bản cũ đã hết hạn chưa (5 phút)
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
              // Hoàn trả định dạng giống hệt như một cú Network Response bình thường 
              // Để React có thể gọi .json() được trơn tru
              return new Response(new Blob([JSON.stringify(data)], { type: 'application/json' }), {
                 status: 200,
                 statusText: 'OK',
                 headers: new Headers({ 'Content-Type': 'application/json' }),
              });
          }
      } catch (e) {
          // Bỏ qua lỗi Parse, gọi mạng mới để đè
          console.warn("Lỗi phân giải Cache:", e);
      }
  }

  // Nếu quá hạn 5 phút hoặc chưa từng có, đi gọi Backend thật
  const response = await fetch(url, options);
  
  if (response.ok) {
      // Nhân bản bản trả lời để đọc lưu dữ liệu trước khi hoàn trả
      const clone = response.clone();
      try {
          const data = await clone.json();
          // Quăng vào rương chứa
          sessionStorage.setItem(cacheKey, JSON.stringify({
              timestamp: Date.now(),
              data: data
          }));
      } catch (e) {
          // Lỗi quá khổ 5MB SessionStorage hoặc dữ liệu k phải JSON
          if (e.name === 'QuotaExceededError') {
             console.warn("Sức chứa SessionStorage đã đầy, tự động dọn dẹp...");
             sessionStorage.clear();
          }
      }
  }
  
  return response;
};
