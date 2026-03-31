package com.example.demo.repository;

import com.example.demo.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    List<Chapter> findByComicIdOrderByChapterNumberDesc(Long comicId);

    @Modifying
    @Query("DELETE FROM Chapter c WHERE c.comic.id = :comicId")
    void deleteByComicId(@Param("comicId") Long comicId);
}
