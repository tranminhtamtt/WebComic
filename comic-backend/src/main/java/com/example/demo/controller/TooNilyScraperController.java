package com.example.demo.controller;

import com.example.demo.service.scraper.TooNilyScraperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller cho Toonily Scraper
 *
 * Endpoints:
 *   GET  /api/scraper/toonily/latest?type=latest|hot|completed|rating|trending
 *   GET  /api/scraper/toonily/search?query=...
 *   GET  /api/scraper/toonily/comic?url=https://toonily.com/serie/slug/
 *   GET  /api/scraper/toonily/chapter?url=https://toonily.com/serie/slug/chapter-1/
 *   GET  /api/scraper/toonily/genre?genre=manhwa&pages=3
 *
 * Family Mode:
 *   - Backend tự động gửi cookie  toonily-mature=1  để bypass Family Mode.
 *   - Kết quả bao gồm cả truyện 18+ (Adult/Mature/Smut/Ecchi).
 *   - Field "isAdult" trong response báo hiệu truyện có nội dung 18+.
 */
@RestController
@RequestMapping("/api/scraper/toonily")
public class TooNilyScraperController {

    @Autowired
    private TooNilyScraperService scraperService;

    /**
     * Lấy danh sách truyện theo loại.
     * type: latest (mới nhất), hot (xem nhiều), completed (đã hoàn thành),
     *       rating (đánh giá cao), trending (xu hướng)
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestComics(
            @RequestParam(value = "type", defaultValue = "latest") String type) {
        try {
            return ResponseEntity.ok(scraperService.getComicsList(type));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                Map.of("error", "Lỗi khi lấy danh sách Toonily: " + e.getMessage())
            );
        }
    }

    /**
     * Tìm kiếm truyện theo tên.
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchComic(@RequestParam("query") String query) {
        try {
            return ResponseEntity.ok(scraperService.searchComic(query));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                Map.of("error", "Lỗi search Toonily: " + e.getMessage())
            );
        }
    }

    /**
     * Lấy chi tiết truyện + danh sách chapter.
     * url: URL trang detail, ví dụ https://toonily.com/serie/manga-slug/
     */
    @GetMapping("/comic")
    public ResponseEntity<?> getComicDetail(@RequestParam("url") String url) {
        try {
            return ResponseEntity.ok(scraperService.getComicDetail(url));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                Map.of("error", "Lỗi lấy detail Toonily: " + e.getMessage())
            );
        }
    }

    /**
     * Lấy danh sách ảnh của một chapter.
     * url: URL trang chapter, ví dụ https://toonily.com/serie/manga-slug/chapter-1/
     */
    @GetMapping("/chapter")
    public ResponseEntity<?> getChapterImages(@RequestParam("url") String url) {
        try {
            return ResponseEntity.ok(scraperService.getChapterImages(url));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                Map.of("error", "Lỗi lấy chapter images Toonily: " + e.getMessage())
            );
        }
    }

    /**
     * Lấy truyện theo thể loại (genre slug).
     * genre: slug của thể loại, ví dụ "manhwa", "adult", "romance"
     * pages: số trang cần lấy (tối đa 10)
     */
    @GetMapping("/genre")
    public ResponseEntity<?> getComicsByGenre(
            @RequestParam("genre") String genre,
            @RequestParam(value = "pages", defaultValue = "3") int pages) {
        try {
            return ResponseEntity.ok(scraperService.getComicsByGenre(genre, pages));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                Map.of("error", "Lỗi lấy genre Toonily: " + e.getMessage())
            );
        }
    }
}
