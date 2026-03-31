package com.example.demo.service;

import com.example.demo.entity.Comment;
import com.example.demo.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;

    public List<Comment> findAll() {
        return commentRepository.findAll();
    }

    public Optional<Comment> findById(Long id) {
        return commentRepository.findById(id);
    }

    public Comment save(Comment comment) {
        return commentRepository.save(comment);
    }

    public void deleteById(Long id) {
        commentRepository.deleteById(id);
    }
    
    public List<Comment> getCommentsByComicId(Long comicId) {
        return commentRepository.findByComicIdAndChapterIdIsNullOrderByCreatedAtDesc(comicId);
    }
    
    public List<Comment> getCommentsByChapterId(Long chapterId) {
        return commentRepository.findByChapterIdOrderByCreatedAtDesc(chapterId);
    }
    
    public List<Comment> getRecentComments() {
        return commentRepository.findTop10ByOrderByCreatedAtDesc();
    }
}
