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
public class HentaivnxScraperService {

    private static final String BASE_URL = "https://www.hentaivnx.com";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int MAX_PAGES = 3;

    // =============================================
    // 1. LẤY DANH SÁCH TRUYỆN
    // =============================================
    public List<Map<String, String>> getComicsList(String type) {
        // HentaiVNX listing: ?page=X at root, or /tim-truyen?page=X
        String path;
        if ("hot".equalsIgnoreCase(type)) {
            path = "/?status=-1&sort=10&page="; // sort by views
        } else if ("completed".equalsIgnoreCase(type)) {
            path = "/?status=2&sort=0&page="; // completed
        } else {
            path = "/?page="; // latest (default)
        }
        return fetchMultiplePages(path, MAX_PAGES);
    }

    // =============================================
    // 2. TÌM KIẾM TRUYỆN
    // =============================================
    public List<Map<String, String>> searchComic(String query) {
        try {
            String safeQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8.toString());
            return fetchMultiplePages("/tim-truyen?keyword=" + safeQuery + "&page=", 2);
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
                                .timeout(15000)
                                .get();

                        List<Map<String, String>> pageComics = parseComicCards(doc, seenUrls);
                        allComics.addAll(pageComics);
                    } catch (Exception e) {
                        System.err.println("HentaiVNX Error fetching page " + page + ": " + e.getMessage());
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

        // HentaiVNX: mỗi truyện là thẻ <a> có href chứa /truyen-hentai/ và có thẻ <img> bên trong
        Elements links = doc.select("a[href*=/truyen-hentai/]");
        for (Element link : links) {
            String url = link.attr("abs:href");

            // Bỏ qua link chapter (có /chapter- trong URL)
            if (url.contains("/chapter-")) continue;

            Element img = link.selectFirst("img");
            if (img == null) continue;

            if (!globalSeenUrls.add(url)) continue;

            String coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            if (coverUrl.contains("data:image") && img.hasAttr("data-src")) {
                coverUrl = img.attr("data-src");
            }
            if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
            if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

            String title = img.hasAttr("alt") ? img.attr("alt") : link.text().trim();
            if (title.isEmpty()) title = "Unknown Title";

            // Lấy latest chapter
            String latestChapter = "N/A";
            Element parent = link.parent();
            if (parent != null) {
                Elements chapterLinks = parent.select("a[href*=/chapter-]");
                if (!chapterLinks.isEmpty()) {
                    latestChapter = chapterLinks.first().text().trim();
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
        rawTitle = rawTitle.replaceAll("\\s*-\\s*HentaiVn.*$", "")
                           .replaceAll("\\s*-\\s*truyện.*$", "")
                           .trim();
        // Fallback: lấy từ thẻ h1
        Element h1 = doc.selectFirst("h1");
        if (h1 != null && !h1.text().isEmpty()) {
            rawTitle = h1.text().trim();
        }
        detail.put("title", rawTitle);

        // === COVER IMAGE ===
        String coverUrl = "";
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null && metaImg.hasAttr("content")) {
            coverUrl = metaImg.attr("content");
        }
        if (coverUrl.isEmpty()) {
            // Tìm ảnh bìa trong khu vực detail
            Elements imgs = doc.select("img[src]");
            for (Element img : imgs) {
                String src = img.attr("src");
                if (src.contains("truyen-hentai") || src.contains("cover") || src.contains("thumb")) {
                    coverUrl = src;
                    break;
                }
            }
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;
        detail.put("coverUrl", coverUrl);

        // === DESCRIPTION ===
        String description = "Không có thông tin nội dung.";
        Element descEl = doc.selectFirst(".detail-content p, .summary-content p, [class*=desc] p, .comic-description");
        if (descEl != null && descEl.text().length() > 20) {
            description = descEl.text().trim();
        } else {
            // Fallback: tìm text dài trong detail area
            Elements paragraphs = doc.select("p");
            for (Element p : paragraphs) {
                String txt = p.text().trim();
                if (txt.length() > 50 && !txt.contains("hentaivnx") && !txt.contains("HentaiVn")) {
                    description = txt;
                    break;
                }
            }
        }
        detail.put("description", description);

        // === AUTHOR ===
        String author = "Đang cập nhật";
        Elements allText = doc.select("li, span, p, div");
        for (Element el : allText) {
            String text = el.text().toLowerCase();
            if (text.contains("tác giả") || text.contains("author")) {
                author = el.text()
                    .replaceAll("(?i)tác giả\\s*:?\\s*", "")
                    .replaceAll("(?i)author\\s*:?\\s*", "")
                    .trim();
                if (author.isEmpty()) author = "Đang cập nhật";
                break;
            }
        }
        detail.put("author", author);

        // ============================================
        // === CHAPTER LIST ===
        // HentaiVNX URL pattern: /truyen-hentai/[slug]/chapter-[num]/[id]
        // ============================================
        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();

        // Lấy slug từ URL truyện để filter
        String comicSlug = extractSlug(url);

        // Tìm tất cả link chapter trong trang
        Elements chapterLinks = doc.select("a[href*=/chapter-]");
        for (Element a : chapterLinks) {
            String href = a.attr("abs:href");
            if (href.isEmpty()) href = a.attr("href");
            if (!href.startsWith("http")) href = BASE_URL + (href.startsWith("/") ? "" : "/") + href;

            // Chỉ lấy chapter thuộc truyện hiện tại
            if (!href.contains(comicSlug)) continue;
            if (seenChapUrls.contains(href)) continue;
            seenChapUrls.add(href);

            Map<String, Object> chapMap = new HashMap<>();
            chapMap.put("url", href);

            // Extract number
            Matcher m = Pattern.compile("chapter-(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE).matcher(href);
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
                    chapMap.put("title", "Chapter 0");
                }
            } else {
                // OneShot hoặc chapter-0
                String linkText = a.text().toLowerCase().trim();
                if (linkText.contains("oneshot") || href.contains("chapter-0")) {
                    chapMap.put("chapterNumber", 1L);
                    chapMap.put("title", "Chapter 1");
                } else {
                    continue;
                }
            }

            chapters.add(chapMap);
        }

        // Sort chapters: 1, 2, 3...
        chapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        // Deduplicate by chapterNumber
        Map<Number, Map<String, Object>> uniqueChapters = new LinkedHashMap<>();
        for (Map<String, Object> ch : chapters) {
            Number n = (Number) ch.get("chapterNumber");
            if (!uniqueChapters.containsKey(n.longValue())) {
                uniqueChapters.put(n.longValue(), ch);
            }
        }
        detail.put("chapters", new ArrayList<>(uniqueChapters.values()));

        return detail;
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

        // HentaiVNX: ảnh thường trong .reading-detail img hoặc .page-chapter img
        Elements imgs = doc.select(".reading-detail img, .page-chapter img, #chapter-content img");
        
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

        // FALLBACK: Regex quét rawHTML
        if (images.size() <= 1) {
            String rawHtml = doc.outerHtml();
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
    // HELPERS
    // =============================================
    private String extractSlug(String url) {
        // From: https://www.hentaivnx.com/truyen-hentai/slug-name-123
        // Extract: slug-name (without trailing number ID)
        String path = url.replaceAll("https?://[^/]+", "");
        // Remove /truyen-hentai/ prefix
        path = path.replace("/truyen-hentai/", "");
        // Remove trailing -ID (numbers at ending after last -)
        path = path.replaceAll("-\\d+$", "");
        // Remove trailing slash
        path = path.replaceAll("/$", "");
        return path;
    }

    private String getBestImageSrc(Element img) {
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

    private boolean isValidChapterImage(String src) {
        if (src == null || src.isEmpty()) return false;
        String lower = src.toLowerCase();

        if (lower.contains("logo") || lower.contains("avatar") || lower.contains("icon") 
            || lower.contains("footer") || lower.contains("header") || lower.contains("ads")
            || lower.contains("banner") || lower.contains("favicon")) {
            return false;
        }

        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
            return !lower.contains("data:image");
        }

        return false;
    }
}
