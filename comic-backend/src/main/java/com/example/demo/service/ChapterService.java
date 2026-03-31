package com.example.demo.service;

import com.example.demo.entity.Chapter;
import com.example.demo.repository.ChapterRepository;
import com.example.demo.dto.ChapterOrderDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;

    public List<Chapter> findAll() {
        return chapterRepository.findAll();
    }

    public Optional<Chapter> findById(Long id) {
        return chapterRepository.findById(id);
    }

    public Chapter save(Chapter chapter) {
        return chapterRepository.save(chapter);
    }

    public void deleteById(Long id) {
        chapterRepository.deleteById(id);
    }
    
    public List<Chapter> getChaptersByComicId(Long comicId) {
        return chapterRepository.findByComicIdOrderByChapterNumberDesc(comicId);
    }
    
    @Transactional
    public void updateChapterOrders(Long comicId, List<ChapterOrderDto> orderDtos) {
        for (ChapterOrderDto dto : orderDtos) {
            Optional<Chapter> optionalChapter = chapterRepository.findById(dto.getId());
            if (optionalChapter.isPresent()) {
                Chapter chapter = optionalChapter.get();
                // Ensure the chapter belongs to the user-specified comic before updating
                if (chapter.getComic().getId().equals(comicId)) {
                    chapter.setChapterNumber(dto.getChapterNumber());
                    chapter.setTitle(dto.getTitle());
                    chapterRepository.save(chapter);
                }
            }
        }
    }
}
