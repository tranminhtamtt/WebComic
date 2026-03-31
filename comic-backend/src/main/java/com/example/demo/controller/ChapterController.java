package com.example.demo.controller;

import com.example.demo.entity.Chapter;
import com.example.demo.dto.ChapterOrderDto;
import com.example.demo.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping
    public ResponseEntity<List<Chapter>> getAll() {
        return ResponseEntity.ok(chapterService.findAll());
    }
    
    @GetMapping("/comic/{comicId}")
    public ResponseEntity<List<Chapter>> getByComicId(@PathVariable Long comicId) {
        return ResponseEntity.ok(chapterService.getChaptersByComicId(comicId));
    }

    @PutMapping("/comic/{comicId}/reorder")
    public ResponseEntity<Void> reorderChapters(@PathVariable Long comicId, @RequestBody List<ChapterOrderDto> orderDtos) {
        chapterService.updateChapterOrders(comicId, orderDtos);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Chapter> getById(@PathVariable Long id) {
        return chapterService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Chapter> save(@RequestBody Chapter chapter) {
        return ResponseEntity.ok(chapterService.save(chapter));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        chapterService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
