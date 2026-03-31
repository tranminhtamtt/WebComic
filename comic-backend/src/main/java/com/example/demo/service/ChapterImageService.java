package com.example.demo.service;

import com.example.demo.entity.ChapterImage;
import com.example.demo.repository.ChapterImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ChapterImageService {

    private final ChapterImageRepository chapterImageRepository;

    public List<ChapterImage> findAll() {
        return chapterImageRepository.findAll();
    }

    public Optional<ChapterImage> findById(Long id) {
        return chapterImageRepository.findById(id);
    }

    public ChapterImage save(ChapterImage chapterImage) {
        return chapterImageRepository.save(chapterImage);
    }

    public void deleteById(Long id) {
        chapterImageRepository.deleteById(id);
    }
    
    public List<ChapterImage> getImagesByChapterId(Long chapterId) {
        return chapterImageRepository.findByChapterIdOrderByPageNumberAsc(chapterId);
    }
}
