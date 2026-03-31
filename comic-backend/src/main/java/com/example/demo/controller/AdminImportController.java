package com.example.demo.controller;

import com.example.demo.entity.Comic;
import com.example.demo.entity.Chapter;
import com.example.demo.entity.ChapterImage;
import com.example.demo.service.ComicService;
import com.example.demo.service.ChapterService;
import com.example.demo.service.ChapterImageService;
import com.example.demo.service.CategoryService;
import com.example.demo.service.TagService;
import com.example.demo.entity.Category;
import com.example.demo.entity.Tag;
import lombok.RequiredArgsConstructor;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminImportController {

    private final ComicService comicService;
    private final ChapterService chapterService;
    private final ChapterImageService chapterImageService;
    private final CategoryService categoryService;
    private final TagService tagService;
    private final Cloudinary cloudinary;

    @PostMapping("/upload-cover")
    public ResponseEntity<?> uploadCover(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "url", required = false) String url) {
        try {
            if (file != null && !file.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("folder", "comics/covers"));
                return ResponseEntity.ok(Map.of("url", uploadResult.get("url")));
            } else if (url != null && !url.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(url, ObjectUtils.asMap("folder", "comics/covers"));
                return ResponseEntity.ok(Map.of("url", uploadResult.get("url")));
            }
            return ResponseEntity.badRequest().body(Map.of("message", "No file or URL provided"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/import-comic")
    public ResponseEntity<?> importComic(@RequestBody Map<String, Object> data) {
        try {
            String title = (String) data.get("title");
            String rawSlug = title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            // Fallback: if slug is empty (non-ASCII title like Japanese/Korean), use hash of title
            if (rawSlug.isEmpty() || rawSlug.equals("-")) {
                rawSlug = "comic-" + Integer.toHexString(title.hashCode());
            }
            String slug = (String) data.getOrDefault("slug", rawSlug);
            String coverUrl = (String) data.getOrDefault("coverUrl", "");
            String description = (String) data.getOrDefault("description", "");
            String author = (String) data.getOrDefault("author", "Đang cập nhật");
            Boolean isAdult = (Boolean) data.getOrDefault("isAdult", false);

            // Truncate fields to match DB column limits to prevent "Data too long" errors
            if (title.length() > 255) title = title.substring(0, 255);
            if (slug.length() > 255) slug = slug.substring(0, 255);
            if (author.length() > 100) author = author.substring(0, 100);
            if (coverUrl.length() > 500) coverUrl = coverUrl.substring(0, 500);

            // Create or update Comic (Upsert)
            Comic comic = comicService.findBySlug(slug).orElse(null);
            boolean isNewComic = (comic == null);

            if (comic == null) {
                // Tạo điểm ngẫu nhiên để test Sort (Nhìn cho giống web thật hihi)
                long randomViews = (long)(Math.random() * 100000) + 1000;
                long randomComments = (long)(Math.random() * 5000) + 50;
                float randomRating = (float)(Math.random() * 2 + 3); // 3.0 to 5.0

                comic = Comic.builder()
                        .title(title)
                        .slug(slug)
                        .coverUrl(coverUrl)
                        .coverPublicId("scraped_" + slug)
                        .description(description)
                        .author(author)
                        .isAdult(isAdult)
                        .totalViews(randomViews)
                        .ratingScore(randomRating)
                        .commentsCount(randomComments)
                        .status(1)
                        .build();
            } else {
                // Upsert info if needed, but here we just update adult status and description optionally
                comic.setIsAdult(isAdult);
            }
            
            // Link Categories
            Set<Category> categories = new HashSet<>();
            if (data.get("categoryIds") != null) {
                List<Integer> categoryIds = (List<Integer>) data.get("categoryIds");
                for (Integer id : categoryIds) {
                    categoryService.findById(id).ifPresent(categories::add);
                }
            }
            comic.setCategories(categories);
            
            // Link Tags
            Set<Tag> tags = new HashSet<>();
            if (data.get("tagIds") != null) {
                List<Integer> tagIds = (List<Integer>) data.get("tagIds");
                for (Integer id : tagIds) {
                    tagService.findById(id).ifPresent(tags::add);
                }
            }
            comic.setTags(tags);

            comic = comicService.save(comic);

            // Fetch existing chapters to prevent duplication
            Set<Float> existingChapterNumbers = new HashSet<>();
            if (!isNewComic) {
                List<Chapter> existingChapters = chapterService.getChaptersByComicId(comic.getId());
                for (Chapter ch : existingChapters) {
                    existingChapterNumbers.add(ch.getChapterNumber());
                }
            }

            int chaptersAdded = 0;
            int chaptersSkipped = 0;

            // Import chapters if provided
            List<Map<String, Object>> chaptersData = (List<Map<String, Object>>) data.get("chapters");
            if (chaptersData != null) {
                for (Map<String, Object> chapterData : chaptersData) {
                    Number chapterNumberObj = (Number) chapterData.getOrDefault("chapterNumber", 1);
                    float chapterNumber = chapterNumberObj.floatValue();

                    if (existingChapterNumbers.contains(chapterNumber)) {
                        chaptersSkipped++;
                        continue; // Bỏ qua chapter đã tồn tại
                    }

                    String chapterTitle = (String) chapterData.getOrDefault("title", "Chapter " + chapterNumberObj);

                    Chapter chapter = Chapter.builder()
                            .comic(comic)
                            .chapterNumber(chapterNumber)
                            .title(chapterTitle)
                            .viewCount(0L)
                            .build();
                    chapter = chapterService.save(chapter);
                    chaptersAdded++;

                    // Import chapter images
                    List<String> imageUrls = (List<String>) chapterData.get("imageUrls");
                    if (imageUrls != null) {
                        for (int i = 0; i < imageUrls.size(); i++) {
                            ChapterImage image = ChapterImage.builder()
                                    .chapter(chapter)
                                    .pageNumber(i + 1)
                                    .imageUrl(imageUrls.get(i))
                                    .publicId("scraped_" + slug + "_ch" + chapterNumberObj + "_p" + (i + 1))
                                    .build();
                            chapterImageService.save(image);
                        }
                    }
                }
            }

            String msg = isNewComic ? "Đã import thành công: " + title : "Đã cập nhật: " + title + " (Thêm " + chaptersAdded + " chap, Bỏ qua " + chaptersSkipped + " chap cũ)";

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", msg,
                "comicId", comic.getId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Lỗi import: " + e.getMessage()
            ));
        }
    }
}
