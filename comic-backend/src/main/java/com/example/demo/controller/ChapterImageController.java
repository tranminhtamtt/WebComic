package com.example.demo.controller;

import com.example.demo.entity.ChapterImage;
import com.example.demo.service.ChapterImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chapter-images")
@RequiredArgsConstructor
public class ChapterImageController {

    private final ChapterImageService chapterImageService;

    @GetMapping
    public ResponseEntity<List<ChapterImage>> getAll() {
        return ResponseEntity.ok(chapterImageService.findAll());
    }

    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<ChapterImage>> getByChapterId(@PathVariable Long chapterId) {
        return ResponseEntity.ok(chapterImageService.getImagesByChapterId(chapterId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChapterImage> getById(@PathVariable Long id) {
        return chapterImageService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ChapterImage> save(@RequestBody ChapterImage chapterImage) {
        return ResponseEntity.ok(chapterImageService.save(chapterImage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        chapterImageService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
