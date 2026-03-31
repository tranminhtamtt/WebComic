package com.example.demo.controller;

import com.example.demo.entity.ReadingHistory;
import com.example.demo.service.ReadingHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reading-history")
@RequiredArgsConstructor
public class ReadingHistoryController {

    private final ReadingHistoryService readingHistoryService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReadingHistory>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(readingHistoryService.getHistoryByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<ReadingHistory> save(@RequestBody ReadingHistory readingHistory) {
        return ResponseEntity.ok(readingHistoryService.save(readingHistory));
    }

}
