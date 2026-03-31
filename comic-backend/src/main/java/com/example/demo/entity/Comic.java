package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "comics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "other_names", length = 255)
    private String otherNames;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(length = 100)
    private String author;

    @Column(name = "cover_url", nullable = false, length = 500)
    private String coverUrl;

    @Column(name = "cover_public_id", nullable = false, length = 255)
    private String coverPublicId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TINYINT DEFAULT 1")
    private Integer status;

    @Column(name = "total_views")
    private Long totalViews;

    @Column(name = "rating_score")
    private Float ratingScore;

    @Column(name = "comments_count")
    private Long commentsCount;

    @Column(name = "is_adult")
    private Boolean isAdult;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @org.hibernate.annotations.Formula("(SELECT ch.title FROM chapters ch WHERE ch.comic_id = id ORDER BY ch.chapter_number DESC LIMIT 1)")
    private String latestChapterTitle;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "comic_categories",
        joinColumns = @JoinColumn(name = "comic_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "comic_tags",
        joinColumns = @JoinColumn(name = "comic_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags;
}
