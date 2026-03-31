package com.example.demo.controller;

import com.example.demo.entity.Comment;
import com.example.demo.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/comic/{comicId}")
    public ResponseEntity<List<Comment>> getByComicId(@PathVariable Long comicId) {
        return ResponseEntity.ok(commentService.getCommentsByComicId(comicId));
    }

    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<Comment>> getByChapterId(@PathVariable Long chapterId) {
        return ResponseEntity.ok(commentService.getCommentsByChapterId(chapterId));
    }

    @PostMapping
    public ResponseEntity<Comment> save(@RequestBody Comment comment) {
        return ResponseEntity.ok(commentService.save(comment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        commentService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Comment>> getRecentComments() {
        return ResponseEntity.ok(commentService.getRecentComments());
    }
}
