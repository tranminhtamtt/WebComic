package com.example.demo.controller;

import com.example.demo.service.scraper.SayhentaiScraperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scraper/sayhentai")
@CrossOrigin(origins = "http://localhost:3000")
public class SayhentaiScraperController {

    @Autowired
    private SayhentaiScraperService scraperService;

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestComics(@RequestParam(value="type", defaultValue="latest") String type) {
        try {
            return ResponseEntity.ok(scraperService.getComicsList(type));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error hitting SayHentai: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchComic(@RequestParam("query") String query) {
        try {
            return ResponseEntity.ok(scraperService.searchComic(query));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error search SayHentai: " + e.getMessage());
        }
    }

    @GetMapping("/comic")
    public ResponseEntity<?> getComicDetail(@RequestParam("url") String url) {
        try {
            return ResponseEntity.ok(scraperService.getComicDetail(url));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting detail SayHentai: " + e.getMessage());
        }
    }

    @GetMapping("/chapter")
    public ResponseEntity<?> getChapterImages(@RequestParam("url") String url) {
        try {
            return ResponseEntity.ok(scraperService.getChapterImages(url));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting Chapter Images SayHentai: " + e.getMessage());
        }
    }
}
