package com.example.demo.repository;

import com.example.demo.entity.Comic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComicRepository extends JpaRepository<Comic, Long> {

    @Override
    @EntityGraph(attributePaths = {"categories", "tags"})
    List<Comic> findAll();

    @EntityGraph(attributePaths = {"categories", "tags"})
    @Query("SELECT c FROM Comic c")
    Page<Comic> findAllWithGraph(Pageable pageable);

    @EntityGraph(attributePaths = {"categories", "tags"})
    @Query("SELECT c FROM Comic c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))")
    Page<Comic> findByTitleContainingIgnoreCaseWithGraph(String title, Pageable pageable);

    @EntityGraph(attributePaths = {"categories", "tags"})
    Optional<Comic> findBySlug(String slug);

    Page<Comic> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}
