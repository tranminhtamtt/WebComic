package com.example.demo.service;

import com.example.demo.entity.Comic;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ComicService {

    private final ComicRepository comicRepository;
    private final ChapterImageRepository chapterImageRepository;
    private final ChapterRepository chapterRepository;
    private final BookmarkRepository bookmarkRepository;
    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final ReadingHistoryRepository readingHistoryRepository;

    @Transactional(readOnly = true)
    public List<Comic> findAll() {
        return comicRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Page<Comic> findComicsPaged(String keyword, Pageable pageable) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return comicRepository.findByTitleContainingIgnoreCaseWithGraph(keyword.trim(), pageable);
        }
        return comicRepository.findAllWithGraph(pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Comic> findById(Long id) {
        return comicRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Comic> findBySlug(String slug) {
        return comicRepository.findBySlug(slug);
    }

    public Comic save(Comic comic) {
        return comicRepository.save(comic);
    }

    @Transactional
    public void deleteById(Long id) {
        // Safe manual cascade deletion for all referenced child entities
        chapterImageRepository.deleteByComicId(id);
        chapterRepository.deleteByComicId(id);
        bookmarkRepository.deleteByComicId(id);
        commentRepository.deleteByComicId(id);
        notificationRepository.deleteByComicId(id);
        readingHistoryRepository.deleteByComicId(id);
        
        // Final delete of the comic
        comicRepository.deleteById(id);
    }
}
