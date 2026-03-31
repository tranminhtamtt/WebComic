package com.example.demo.seeder;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.demo.entity.Chapter;
import com.example.demo.entity.ChapterImage;
import com.example.demo.entity.Comic;
import com.example.demo.repository.ChapterImageRepository;
import com.example.demo.repository.ChapterRepository;
import com.example.demo.repository.ComicRepository;
import com.example.demo.entity.Comment;
import com.example.demo.entity.User;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ComicRepository comicRepository;
    private final ChapterRepository chapterRepository;
    private final ChapterImageRepository chapterImageRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final Cloudinary cloudinary;

    @Override
    public void run(String... args) throws Exception {
        if (comicRepository.count() == 0) {
            System.out.println("Bắt đầu tải và lưu truyện Kagurabachi vào Cloudinary...");
            
            // 1. Lấy trang 1 làm ảnh bìa
            String coverUrl = "https://manga.pixelimg.net/kagurabachi/chapter-1/001.jpg";
            String secureCoverUrl = coverUrl;
            String coverPublicId = "default_cover";
            
            try {
                Map uploadResult = cloudinary.uploader().upload(coverUrl, ObjectUtils.asMap("folder", "comics/kagurabachi"));
                secureCoverUrl = (String) uploadResult.get("secure_url");
                coverPublicId = (String) uploadResult.get("public_id");
            } catch (Exception e) {
                System.out.println("Lỗi upload cover, dùng tạm link gốc: " + e.getMessage());
            }

            // 2. Lưu thông tin truyện
            Comic comic = Comic.builder()
                .title("Kagurabachi")
                .slug("kagurabachi")
                .author("Takeru Hokazono")
                .coverUrl(secureCoverUrl)
                .coverPublicId(coverPublicId)
                .description("Bộ truyện Kagurabachi cực hot hiện nay.")
                .status(1)
                .totalViews(1500000L)
                .ratingScore(9.8f)
                .isAdult(false) // Thuộc Family Mode mặc định
                .build();
            comic = comicRepository.save(comic);

            // 3. Lưu thông tin Chapter 1
            Chapter ch1 = Chapter.builder()
                .comic(comic)
                .chapterNumber(1.0f)
                .title("Chapter 1: Nhiệm vụ đầu tiên")
                .viewCount(500000L)
                .build();
            ch1 = chapterRepository.save(ch1);

            // 4. Lưu 44 trang truyện
            for(int i = 1; i <= 44; i++) {
                String imgUrl = String.format("https://manga.pixelimg.net/kagurabachi/chapter-1/%03d.jpg", i);
                String secureImgUrl = imgUrl;
                String publicId = "kagura_ch1_page_" + i;
                
                try {
                    System.out.println("Đang upload trang " + i + "/44...");
                    Map imgResult = cloudinary.uploader().upload(imgUrl, ObjectUtils.asMap("folder", "comics/kagurabachi/ch1"));
                    secureImgUrl = (String) imgResult.get("secure_url");
                    publicId = (String) imgResult.get("public_id");
                } catch (Exception e) {
                    System.out.println("Lỗi upload trang " + i + ", dùng link gốc.");
                }

                ChapterImage ci = ChapterImage.builder()
                    .chapter(ch1)
                    .pageNumber(i)
                    .imageUrl(secureImgUrl)
                    .publicId(publicId)
                    .build();
                chapterImageRepository.save(ci);
            }
            
            System.out.println("Hoàn tất khởi tạo dữ liệu Kagurabachi!");
        }

        // 5. Khởi tạo Comments nêú rỗng
        if (commentRepository.count() == 0 && comicRepository.count() > 0) {
            System.out.println("Bảng Comments rỗng, tiến hành bơm dữ liệu mẫu...");
            
            // Tìm 1 user bất kỳ (tạo sẵn admin chẳng hạn) hoặc tạo mới
            User seederUser = userRepository.findById(1L).orElse(null);
            if (seederUser == null) {
                seederUser = User.builder()
                    .username("seeder_" + System.currentTimeMillis())
                    .email("seeder" + System.currentTimeMillis() + "@gmail.com")
                    .passwordHash("mockHash123")
                    .role("USER")
                    .dob(java.time.LocalDate.now())
                    .build();
                seederUser = userRepository.save(seederUser);
            }

            // Lấy 5 truyện đầu tiên
            List<Comic> sampleComics = comicRepository.findAll().stream().limit(5).toList();

            String[] reviews = {
                "Truyện đỉnh thiệc sự khum có gì bàn cãi 💯",
                "Nét vẽ xuất sắc qúa ad ơi, hóng chap mới từng ngày",
                "Quá bánh cuốn! Đã đọc đi đọc lại 3 lần ròi...",
                "Bộ này là một trong những siêu phẩm đáng gờm nhất thập kỷ này",
                "Tình tiết hơi chậm một tí nhưng build world đỉnh vc",
                "Mong ad bão chap đi ạ, đọc dính quá",
                "Bộ main out trình bá đạo quá kkkk",
                "Chờ mãi mới ra :(( Cám ơn nhóm dịch nhé!",
            };

            for (int i = 0; i < reviews.length; i++) {
                Comic targetComic = sampleComics.get(i % sampleComics.size());
                Comment c = Comment.builder()
                    .user(seederUser)
                    .comic(targetComic)
                    .content(reviews[i])
                    .build();
                commentRepository.save(c);
            }
            
            System.out.println("Đã bơm dữ liệu Comments thành công!");
        }
    }
}
