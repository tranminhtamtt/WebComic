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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class DamconuongScraperService {

    private static final String BASE_URL = "https://damconuong.blog";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int MAX_PAGES_TO_FETCH = 5;

    // =============================================
    // 1. LẤY DANH SÁCH TRUYỆN
    // =============================================
    public List<Map<String, String>> getComicsList(String type) {
        String query = "/tim-kiem?sort=-updated_at&page=";
        if ("hot".equalsIgnoreCase(type)) {
            query = "/tim-kiem?sort=-views&page=";
        } else if ("completed".equalsIgnoreCase(type)) {
            query = "/tim-kiem?sort=-updated_at&filter[status]=2&page=";
        }
        return fetchMultiplePages(query, MAX_PAGES_TO_FETCH);
    }

    public List<Map<String, String>> getLatestComics() {
        return getComicsList("latest");
    }

    // =============================================
    // 2. TÌM KIẾM TRUYỆN
    // =============================================
    public List<Map<String, String>> searchComic(String query) {
        try {
            String safeQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8.toString());
            return fetchMultiplePages("/tim-kiem?sort=-updated_at&filter[status]=2,1&filter[name]=" + safeQuery + "&page=", MAX_PAGES_TO_FETCH);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // =============================================
    // HELPER: Fetch nhiều trang song song
    // =============================================
    private List<Map<String, String>> fetchMultiplePages(String path, int maxPages) {
        List<Map<String, String>> allComics = new CopyOnWriteArrayList<>();
        Set<String> seenUrls = Collections.synchronizedSet(new HashSet<>());

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

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        return new ArrayList<>(allComics);
    }

    // =============================================
    // HELPER: Parse comic cards từ trang listing
    // =============================================
    private List<Map<String, String>> parseComicCards(Document doc, Set<String> globalSeenUrls) {
        List<Map<String, String>> comics = new ArrayList<>();

        // Lấy tất cả thẻ <a> trỏ đến /truyen/ và có chứa <img> (= comic card)
        Elements links = doc.select("a[href*=/truyen/]");
        for (Element link : links) {
            String url = link.attr("abs:href");

            // Chỉ lấy link truyện chính, bỏ qua link chapter
            if (url.contains("/chapter-") || url.contains("/chap-") || url.contains("/chuong-") || url.contains("/oneshot")) {
                continue;
            }

            Element img = link.selectFirst("img");
            if (img == null) continue;

            if (!globalSeenUrls.add(url)) continue;

            String coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            if (coverUrl.contains("data:image") && img.hasAttr("data-src")) {
                coverUrl = img.attr("data-src");
            }
            if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

            String title = img.hasAttr("alt") ? img.attr("alt") : "Unknown Title";

            // Lấy latest chapter từ text phụ bên trong card
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

    // =============================================
    // 3. LẤY CHI TIẾT TRUYỆN + DANH SÁCH CHAPTER
    // =============================================
    public Map<String, Object> getComicDetail(String url) throws IOException {
        Document doc = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(15000)
                .get();

        Map<String, Object> detail = new HashMap<>();

        // === TITLE ===
        String rawTitle = doc.title();
        // Loại bỏ suffix " - HentaiVN - Dâm Cô Nương"
        rawTitle = rawTitle.replaceAll("\\s*-\\s*HentaiVN.*$", "")
                           .replaceAll("\\s*-\\s*Dâm Cô Nương.*$", "")
                           .trim();
        detail.put("title", rawTitle);

        // === COVER IMAGE ===
        String coverUrl = "";
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null && metaImg.hasAttr("content")) {
            coverUrl = metaImg.attr("content");
        } else {
            Element img = doc.selectFirst("img[alt]");
            if (img != null) {
                coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            }
        }
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;
        detail.put("coverUrl", coverUrl);

        // === DESCRIPTION ===
        String description = "Không có thông tin nội dung.";
        // Tìm thẻ chứa nội dung mô tả (thường là div/p có text dài sau phần metadata)
        Elements paragraphs = doc.select("p, div.prose, div[class*=desc]");
        for (Element p : paragraphs) {
            String text = p.text().trim();
            if (text.length() > 50 && !text.contains("Bảng Xếp Hạng") && !text.contains("damconuong")) {
                description = text;
                break;
            }
        }
        detail.put("description", description);

        // === AUTHOR ===
        String author = "Đang cập nhật";
        Elements allElements = doc.select("span, div, p");
        for (Element el : allElements) {
            String text = el.text().toLowerCase();
            if (text.contains("tác giả:") || text.contains("tác giả :")) {
                author = el.text().replaceAll("(?i)tác giả\\s*:?\\s*", "").trim();
                if (author.isEmpty()) author = "Đang cập nhật";
                break;
            }
        }
        detail.put("author", author);

        // ============================================
        // === CHAPTER LIST - Logic mới hoàn toàn ===
        // ============================================
        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();

        // Chuẩn hóa URL truyện (bỏ trailing slash)
        String comicSlug = url.replaceAll("/$", "");
        if (comicSlug.startsWith("http")) {
            comicSlug = comicSlug.replace(BASE_URL, "");
        }

        // CÁCH 1: Lấy từ ul#chapterList (Livewire rendered)
        Element chapterListUl = doc.selectFirst("ul#chapterList");
        if (chapterListUl != null) {
            Elements chapterAnchors = chapterListUl.select("a[href]");
            for (Element a : chapterAnchors) {
                processChapterLink(a, seenChapUrls, chapters, comicSlug);
            }
        }

        // CÁCH 2: Fallback - tìm tất cả link chapter trong toàn bộ DOM
        if (chapters.isEmpty()) {
            Elements allChapterLinks = doc.select("a[href*=/chapter-], a[href*=/chap-], a[href*=/chuong-], a[href*=/oneshot]");
            for (Element a : allChapterLinks) {
                String href = a.attr("abs:href");
                // Chỉ lấy chapter thuộc truyện hiện tại
                if (href.contains(comicSlug)) {
                    processChapterLink(a, seenChapUrls, chapters, comicSlug);
                }
            }
        }

        // CÁCH 3: Fallback cuối - quét rawHTML bằng regex
        if (chapters.isEmpty()) {
            String rawHtml = doc.outerHtml();
            Pattern pattern = Pattern.compile(
                "href=[\"']([^\"']*" + Pattern.quote(comicSlug) + "/(?:chapter|chap|chuong)-?(\\d+(?:\\.\\d+)?)[^\"']*)[\"']",
                Pattern.CASE_INSENSITIVE
            );
            Matcher matcher = pattern.matcher(rawHtml);
            while (matcher.find()) {
                String chUrl = matcher.group(1).replace("\\/", "/");
                String chNumStr = matcher.group(2);
                if (!chUrl.startsWith("http")) chUrl = BASE_URL + (chUrl.startsWith("/") ? "" : "/") + chUrl;

                if (!seenChapUrls.contains(chUrl)) {
                    seenChapUrls.add(chUrl);
                    try {
                        long num = Long.parseLong(chNumStr);
                        Map<String, Object> chapMap = new HashMap<>();
                        chapMap.put("url", chUrl);
                        chapMap.put("title", "Chapter " + num);
                        chapMap.put("chapterNumber", num);
                        chapters.add(chapMap);
                    } catch (Exception ignored) {}
                }
            }
        }

        // Sort chapters: 1, 2, 3...
        chapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        detail.put("chapters", chapters);
        return detail;
    }

    // =============================================
    // HELPER: Xử lý 1 link chapter -> extract số sạch
    // =============================================
    private void processChapterLink(Element a, Set<String> seenChapUrls, List<Map<String, Object>> chapters, String comicSlug) {
        String href = a.attr("abs:href");
        if (href.isEmpty()) href = a.attr("href");
        if (!href.startsWith("http")) href = BASE_URL + (href.startsWith("/") ? "" : "/") + href;

        if (seenChapUrls.contains(href)) return;
        seenChapUrls.add(href);

        Map<String, Object> chapMap = new HashMap<>();
        chapMap.put("url", href);

        // Extract số chapter từ URL
        // Pattern: /chapter-56, /chap-3, /chuong-10, /oneshot
        Matcher m = Pattern.compile("(?:chapter|chap|chuong)-?(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE).matcher(href);

        if (m.find()) {
            String numStr = m.group(1);
            try {
                double numD = Double.parseDouble(numStr);
                if (numD == (long) numD) {
                    long num = (long) numD;
                    chapMap.put("chapterNumber", num);
                    chapMap.put("title", "Chapter " + num);
                } else {
                    chapMap.put("chapterNumber", numD);
                    chapMap.put("title", "Chapter " + numStr);
                }
            } catch (Exception e) {
                chapMap.put("chapterNumber", 0L);
                chapMap.put("title", "Chapter " + numStr);
            }
        } else if (href.contains("/oneshot")) {
            chapMap.put("chapterNumber", 1L);
            chapMap.put("title", "Chapter 1");
        } else {
            // Không tìm được số -> bỏ qua
            return;
        }

        chapters.add(chapMap);
    }

    // =============================================
    // 4. LẤY ẢNH CHAPTER
    // =============================================
    public List<String> getChapterImages(String chapterUrl) throws IOException {
        Document doc = Jsoup.connect(chapterUrl)
                .userAgent(USER_AGENT)
                .timeout(15000)
                .get();

        List<String> images = new ArrayList<>();

        // CÁCH 1: Lấy ảnh từ #chapter-content > img hoặc .chapter-img
        Elements imgs = doc.select("#chapter-content img");
        if (imgs.isEmpty()) {
            imgs = doc.select(".chapter-img");
        }
        if (imgs.isEmpty()) {
            // Fallback: tất cả img trong body
            imgs = doc.select("img");
        }

        for (Element img : imgs) {
            String src = getBestImageSrc(img);
            if (src != null && isValidChapterImage(src)) {
                if (src.startsWith("//")) src = "https:" + src;
                else if (src.startsWith("/")) src = BASE_URL + src;

                if (!images.contains(src)) {
                    images.add(src);
                }
            }
        }

        // CÁCH 2 (FALLBACK): Regex quét rawHTML tìm ảnh trên domain chứa ảnh chapter
        if (images.size() <= 1) {
            String rawHtml = doc.outerHtml();
            // Ảnh DCN thường host trên dcnvn*.mbpro.vip hoặc domain đặc thù
            Pattern p = Pattern.compile(
                "(https?:\\\\?/\\\\?/[^\"'\\s<>]+?\\.(?:jpg|jpeg|png|webp))",
                Pattern.CASE_INSENSITIVE
            );
            Matcher m = p.matcher(rawHtml);
            while (m.find()) {
                String matchUrl = m.group(1).replace("\\/", "/").trim();
                if (isValidChapterImage(matchUrl) && !images.contains(matchUrl)) {
                    images.add(matchUrl);
                }
            }
        }

        return images;
    }

    // =============================================
    // HELPER: Lấy src ảnh tốt nhất (ưu tiên data-src > src)
    // =============================================
    private String getBestImageSrc(Element img) {
        // Ưu tiên data-src (lazy loading)
        String src = img.attr("data-src");
        if (src == null || src.isEmpty() || src.startsWith("data:image")) {
            src = img.attr("data-original");
        }
        if (src == null || src.isEmpty() || src.startsWith("data:image")) {
            src = img.attr("src");
        }
        if (src == null || src.startsWith("data:image")) {
            return null;
        }
        return src.trim();
    }

    // =============================================
    // HELPER: Kiểm tra ảnh có phải ảnh chapter hợp lệ không
    // =============================================
    private boolean isValidChapterImage(String src) {
        if (src == null || src.isEmpty()) return false;
        String lower = src.toLowerCase();

        // Loại bỏ ảnh logo, avatar, icon
        if (lower.contains("logo") || lower.contains("avatar") || lower.contains("icon") || lower.contains("footer") || lower.contains("header")) {
            return false;
        }

        // Chấp nhận ảnh từ domain chứa ảnh chapter DCN
        if (lower.contains("dcnvn") || lower.contains("mbpro.vip")) {
            return true;
        }

        // Chấp nhận ảnh có extension phổ biến và không phải placeholder
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
            return !lower.contains("data:image");
        }

        return false;
    }
}
