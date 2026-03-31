package com.example.demo.repository;

import com.example.demo.entity.ChapterImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterImageRepository extends JpaRepository<ChapterImage, Long> {
    List<ChapterImage> findByChapterIdOrderByPageNumberAsc(Long chapterId);

    @Modifying
    @Query("DELETE FROM ChapterImage ci WHERE ci.chapter.id IN (SELECT c.id FROM Chapter c WHERE c.comic.id = :comicId)")
    void deleteByComicId(@Param("comicId") Long comicId);
}
