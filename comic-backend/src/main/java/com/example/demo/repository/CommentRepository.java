package com.example.demo.repository;

import com.example.demo.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByComicIdAndChapterIdIsNullOrderByCreatedAtDesc(Long comicId);
    List<Comment> findByChapterIdOrderByCreatedAtDesc(Long chapterId);
    List<Comment> findTop10ByOrderByCreatedAtDesc();

    @Modifying
    @Query("DELETE FROM Comment c WHERE c.comic.id = :comicId")
    void deleteByComicId(@Param("comicId") Long comicId);
}
