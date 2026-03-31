package com.example.demo.service.scraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class DamconuongScraperService {

    private static final String BASE_URL = "https://damconuong.blog";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int MAX_PAGES_TO_FETCH = 5; // Fetch 5 pages to get 150 comics

    // Lấy danh sách truyện mới nhất (Scan nhiều trang giống Otruyen)
    public List<Map<String, String>> getComicsList(String type) {
        String query = "/tim-kiem?sort=-updated_at&page=";
        if ("hot".equalsIgnoreCase(type)) {
            // Hot / View
            query = "/tim-kiem?sort=-views&page=";
        } else if ("completed".equalsIgnoreCase(type)) {
            // Status=2 is completed
            query = "/tim-kiem?sort=-updated_at&filter[status]=2&page=";
        }
        return fetchMultiplePages(query, MAX_PAGES_TO_FETCH);
    }
    
    public List<Map<String, String>> getLatestComics() {
        return getComicsList("latest");
    }

    // Tìm kiếm truyện (Scan nhiều trang)
    public List<Map<String, String>> searchComic(String query) {
        try {
            // Sử dụng bộ lọc filter[name] chính xác theo Livewire của Damconuong
            String safeQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8.toString());
            return fetchMultiplePages("/tim-kiem?sort=-updated_at&filter[status]=2,1&filter[name]=" + safeQuery + "&page=", MAX_PAGES_TO_FETCH);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, String>> fetchMultiplePages(String path, int maxPages) {
        List<Map<String, String>> allComics = new CopyOnWriteArrayList<>();
        Set<String> seenUrls = Collections.synchronizedSet(new HashSet<>());

        // Sử dụng CompletableFuture để quét song song cho cực nhanh
        List<CompletableFuture<Void>> futures = IntStream.rangeClosed(1, maxPages)
                .mapToObj(page -> CompletableFuture.runAsync(() -> {
                    try {
                        String fullUrl = BASE_URL + path + page;
                        Document doc = Jsoup.connect(fullUrl)
                                .userAgent(USER_AGENT)
                                .timeout(10000)
                                .get();
                        
                        List<Map<String, String>> pageComics = parseComicCards(doc, seenUrls);
                        allComics.addAll(pageComics);
                    } catch (Exception e) {
                        System.err.println("Damconuong Error fetching page " + page + ": " + e.getMessage());
                    }
                }))
                .collect(Collectors.toList());

        // Đợi tất cả hoàn thành
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // Sort by list index logic isn't strictly necessary for admin dashboard since they just want bulk comics
        return new ArrayList<>(allComics);
    }

    // Helper: parse ds truyện từ document, có Set global để chống trùng
    private List<Map<String, String>> parseComicCards(Document doc, Set<String> globalSeenUrls) {
        List<Map<String, String>> comics = new ArrayList<>();

        Elements links = doc.select("a[href^=" + BASE_URL + "/truyen/]");
        for (Element link : links) {
            String url = link.attr("href");
            
            Element img = link.selectFirst("img");
            if (img == null) continue;

            // Chống lấy trùng lặp giữa các page
            if (!globalSeenUrls.add(url)) continue;

            String coverUrl = img.attr("src");
            if (coverUrl.contains("data:image") && img.hasAttr("data-src")) {
                coverUrl = img.attr("data-src");
            }
            if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

            String title = img.hasAttr("alt") ? img.attr("alt") : "Unknown Title";
            
            String latestChapter = "N/A";
            Elements badges = link.select("span, div");
            for (Element b : badges) {
                String t = b.text().toLowerCase();
                if (t.contains("chapter") || t.contains("chương") || t.contains("chap")) {
                    latestChapter = b.text();
                    break;
                }
            }

            Map<String, String> comicObj = new HashMap<>();
            comicObj.put("url", url);
            comicObj.put("title", title);
            comicObj.put("coverUrl", coverUrl);
            comicObj.put("latestChapter", latestChapter);
            comics.add(comicObj);
        }
        return comics;
    }

    // Lấy chi tiết truyện
    public Map<String, Object> getComicDetail(String url) throws IOException {
        Document doc = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(15000)
                .get();

        Map<String, Object> detail = new HashMap<>();

        String coverUrl = "";
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null && metaImg.hasAttr("content")) {
            coverUrl = metaImg.attr("content");
        } else {
            Element img = doc.selectFirst("img");
            if (img != null) {
                coverUrl = img.hasAttr("src") ? img.attr("src") : "";
            }
        }
        detail.put("title", doc.title().replace("- Dâm Cô Nương", "").trim());
        detail.put("coverUrl", coverUrl.startsWith("/") ? BASE_URL + coverUrl : coverUrl);

        String description = "Không có thông tin nội dung.";
        Elements paragraphs = doc.select("p");
        for (Element p : paragraphs) {
            if (p.text().length() > 50) {
                description = p.text();
                break;
            }
        }
        detail.put("description", description);
        
        String author = "Đang cập nhật";
        Elements spans = doc.select("span, div");
        for (Element s : spans) {
            if (s.text().toLowerCase().contains("tác giả:")) {
                author = s.text().replace("Tác giả:", "").trim();
                break;
            }
        }
        detail.put("author", author);

        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChaps = new HashSet<>();
        
        // CÁCH 1: Lấy tất cả các thẻ <a> trong toàn bộ DOM có chứa "/chapter-", "/chap-", "/chuong-"
        Elements chapterLinks = doc.select("a[href*=/chapter-], a[href*=/chap-], a[href*=/chuong-]");
        for (Element link : chapterLinks) {
            String chUrl = link.attr("href");
            // Đảm bảo đúng truyện hiện tại
            if (chUrl.startsWith(url) || chUrl.contains(url.replace(BASE_URL, ""))) {
                if (!seenChaps.contains(chUrl)) {
                    seenChaps.add(chUrl);
                    String title = link.text().trim();
                    if (title.isEmpty()) title = "Chapter";
                    
                    Map<String, Object> chapMap = new HashMap<>();
                    chapMap.put("url", chUrl);
                    chapMap.put("title", title);
                    
                    // Đoán số chapter từ URL hoặc title
                    double num = 0;
                    java.util.regex.Matcher mNum = java.util.regex.Pattern.compile("(?:chapter|chap|chuong)[\\s-]*(\\d+(?:\\.\\d+)?)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(chUrl + " " + title);
                    if (mNum.find()) {
                         try { num = Double.parseDouble(mNum.group(1)); } catch(Exception ignored){}
                    }
                    chapMap.put("chapterNumber", num == (long)num ? (long)num : num);
                    chapters.add(chapMap);
                }
            }
        }
        
        // CÁCH 2: Dùng Regex quét toàn bộ rawHTML để tìm các chapter bị giấu trong Script (JSON)
        String rawHtml = doc.outerHtml();
        String safeUrlPattern = java.util.regex.Pattern.quote(url);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("href=\\\\?[\"']([^\"'>\\s\\\\]*(?:chapter|chuong|chap)-?(\\d+(?:\\.\\d+)?)[^\"'>\\s\\\\]*)\\\\?[\"']", java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Matcher matcher = pattern.matcher(rawHtml);
        
        while (matcher.find()) {
            String chUrl = matcher.group(1).replace("\\/", "/");
            String chNumStr = matcher.group(2); // The number group
            if (!chUrl.startsWith("http")) chUrl = BASE_URL + (chUrl.startsWith("/") ? "" : "/") + chUrl;
            
            if (!seenChaps.contains(chUrl)) {
                seenChaps.add(chUrl);
                
                Map<String, Object> chapMap = new HashMap<>();
                chapMap.put("url", chUrl);
                
                try {
                    double num = Double.parseDouble(chNumStr);
                    // Neu la so nguyen (vi du 1.0), hien thi la 1. Neu la 1.5 thi van la 1.5
                    String displayNum = (num == (long) num) ? String.valueOf((long) num) : String.valueOf(num);
                    Object finalNum = (num == (long) num) ? (long) num : num;
                    
                    chapMap.put("title", "Chapter " + displayNum);
                    chapMap.put("chapterNumber", finalNum);
                } catch (Exception e) {
                    chapMap.put("title", "Chapter " + chNumStr);
                    chapMap.put("chapterNumber", 0L);
                }
                
                chapters.add(chapMap);
            }
        }
        
        // Sort chapters chronologically: 1, 2, 3..
        chapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        detail.put("chapters", chapters);

        return detail;
    }

    // Trích xuất các URLs ảnh trong một chapter
    public List<String> getChapterImages(String chapterUrl) throws IOException {
        Document doc = Jsoup.connect(chapterUrl)
                .userAgent(USER_AGENT)
                .timeout(15000)
                .get();

        List<String> images = new ArrayList<>();
        
        // Lọc kỹ ảnh chapter theo selector bạn yêu cầu
        Elements imgs = doc.select("#chapter-content .chapter-img");
        if (imgs.isEmpty()) {
            imgs = doc.select("#chapter-content img"); // Đề phòng web mất class
        }
        
        for (Element img : imgs) {
            String src = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            
            // Nếu vẫn dính ảnh rỗng SVG, ưu tiên thêm data-original
            if (src == null || src.startsWith("data:image")) {
                 if (img.hasAttr("data-original")) src = img.attr("data-original");
            }

            if (src != null && !src.startsWith("data:image")) {
                src = src.trim(); // QUAN TRỌNG: Cắt bỏ ký tự \n hoặc space thừa ở mã nguồn DCN
                
                if (!src.contains("logo") && !src.contains("avatar") && 
                   (src.endsWith(".jpg") || src.endsWith(".jpeg") || src.endsWith(".png") || src.endsWith(".webp") || src.contains("dcnvn") || src.contains("mbpro.vip"))) {
                    
                    if (src.startsWith("//")) src = "https:" + src;
                    else if (src.startsWith("/")) src = BASE_URL + src;
                    
                    if (!images.contains(src)) {
                        images.add(src);
                    }
                }
            }
        }
        
        // CỨU CÁNH (FALLBACK): Nếu vẫn chỉ lấy được 1 ảnh do server giấu các ảnh còn lại trong thẻ <script>
        if (images.size() <= 1) {
            String rawHtml = doc.outerHtml();
            java.util.regex.Pattern p = java.util.regex.Pattern.compile("(https?:\\\\?/\\\\?/[^\"'\\s<>]+?\\.(?:jpg|jpeg|png|webp))", java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher m = p.matcher(rawHtml);
            while (m.find()) {
                String matchUrl = m.group(1).replace("\\/", "/").trim();
                if (!matchUrl.contains("logo") && !matchUrl.contains("avatar") && !images.contains(matchUrl)) {
                    images.add(matchUrl);
                }
            }
        }
        
        return images;
    }
}
