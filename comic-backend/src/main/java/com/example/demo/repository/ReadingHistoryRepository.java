package com.example.demo.repository;

import com.example.demo.entity.ReadingHistory;
import com.example.demo.entity.ReadingHistoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, ReadingHistoryId> {
    List<ReadingHistory> findByUserIdOrderByUpdatedAtDesc(Long userId);

    @Modifying
    @Query("DELETE FROM ReadingHistory rh WHERE rh.comic.id = :comicId")
    void deleteByComicId(@Param("comicId") Long comicId);
}
