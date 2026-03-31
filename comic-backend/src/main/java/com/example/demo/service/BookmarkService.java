package com.example.demo.service;

import com.example.demo.entity.Bookmark;
import com.example.demo.entity.BookmarkId;
import com.example.demo.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;

    public List<Bookmark> findAll() {
        return bookmarkRepository.findAll();
    }

    public Optional<Bookmark> findById(BookmarkId id) {
        return bookmarkRepository.findById(id);
    }

    public Bookmark save(Bookmark bookmark) {
        return bookmarkRepository.save(bookmark);
    }

    public void deleteById(BookmarkId id) {
        bookmarkRepository.deleteById(id);
    }
    
    public List<Bookmark> getBookmarksByUserId(Long userId) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
