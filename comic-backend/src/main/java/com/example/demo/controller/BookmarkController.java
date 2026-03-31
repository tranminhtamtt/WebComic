package com.example.demo.controller;

import com.example.demo.entity.Bookmark;
import com.example.demo.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Bookmark>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(bookmarkService.getBookmarksByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Bookmark> save(@RequestBody Bookmark bookmark) {
        return ResponseEntity.ok(bookmarkService.save(bookmark));
    }

}
