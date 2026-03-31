package com.example.demo.repository;

import com.example.demo.entity.Comic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ComicRepository extends JpaRepository<Comic, Long> {
    Optional<Comic> findBySlug(String slug);
    Page<Comic> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}
