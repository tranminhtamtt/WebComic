package com.example.demo.controller;

import com.example.demo.entity.Comic;
import com.example.demo.service.ComicService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comics")
@RequiredArgsConstructor
public class ComicController {

    private final ComicService comicService;

    @GetMapping
    public ResponseEntity<List<Comic>> getAll() {
        return ResponseEntity.ok(comicService.findAll());
    }

    @GetMapping("/page")
    public ResponseEntity<Page<Comic>> getComicsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String keyword) {
        
        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(comicService.findComicsPaged(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Comic> getById(@PathVariable Long id) {
        return comicService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Comic> save(@RequestBody Comic comic) {
        return ResponseEntity.ok(comicService.save(comic));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Comic> update(@PathVariable Long id, @RequestBody Comic updatedComic) {
        return comicService.findById(id).map(comic -> {
            comic.setTitle(updatedComic.getTitle());
            comic.setAuthor(updatedComic.getAuthor());
            comic.setDescription(updatedComic.getDescription());
            comic.setCoverUrl(updatedComic.getCoverUrl());
            comic.setIsAdult(updatedComic.getIsAdult());
            comic.setStatus(updatedComic.getStatus());
            // otherNames/coverPublicId can be updated similarly if needed
            return ResponseEntity.ok(comicService.save(comic));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        comicService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
