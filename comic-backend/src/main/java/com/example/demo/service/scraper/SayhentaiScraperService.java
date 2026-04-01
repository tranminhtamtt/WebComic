package com.example.demo.service.scraper;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class SayhentaiScraperService {

    private static final String BASE_URL = "https://sayhentai.vc";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int MAX_PAGES = 3;

    // =============================================
    // 1. LẤY DANH SÁCH TRUYỆN (Trang Home / Hot / Completed)
    // =============================================
    public List<Map<String, String>> getComicsList(String type) {
        String path;
        if ("hot".equalsIgnoreCase(type)) {
            path = "/?m_orderby=views&page=";
        } else if ("completed".equalsIgnoreCase(type)) {
            path = "/completed?page=";
        } else {
            path = "/?page="; // latest (default — trang chủ)
        }
        return fetchMultiplePages(path, MAX_PAGES);
    }

    // =============================================
    // 2. TÌM KIẾM TRUYỆN — URL đúng: /search?s={query}
    // =============================================
    public List<Map<String, String>> searchComic(String query) {
        try {
            String safeQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
            // SayHentai search: /search?s=keyword
            String searchUrl = BASE_URL + "/search?s=" + safeQuery;
            Document doc = getDocument(searchUrl);
            Set<String> seenUrls = new HashSet<>();
            return parseComicCards(doc, seenUrls);
        } catch (Exception e) {
            System.err.println("SayHentai search error: " + e.getMessage());
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
                        Document doc = getDocument(fullUrl);
                        List<Map<String, String>> pageComics = parseComicCards(doc, seenUrls);
                        allComics.addAll(pageComics);
                    } catch (Exception e) {
                        System.err.println("SayHentai Error fetching page " + page + ": " + e.getMessage());
                    }
                }))
                .collect(Collectors.toList());

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        return new ArrayList<>(allComics);
    }

    // =============================================
    // HELPER: Parse comic cards từ trang listing
    // DOM thực tế SayHentai (Madara theme):
    //   - Cards ở main listing:  div.page-item-detail
    //   - Cards ở slide/top:     div.item.col-4
    //   - Link truyện: a[href*=/truyen-][href$=.html]
    //   - Cover: img.img-responsive (src trực tiếp, không dùng data-src)
    //   - Title: .post-title h3 a  hoặc  .line-2 a  hoặc img[alt]
    //   - Latest chapter: a.btn-link
    // =============================================
    private List<Map<String, String>> parseComicCards(Document doc, Set<String> globalSeenUrls) {
        List<Map<String, String>> comics = new ArrayList<>();

        // CÁCH 1: Parse từ div.page-item-detail (section "Mới Cập Nhật" + search results)
        Elements cards = doc.select("div.page-item-detail");
        for (Element card : cards) {
            Map<String, String> comic = extractComicFromCard(card, globalSeenUrls);
            if (comic != null) comics.add(comic);
        }

        // CÁCH 2: Parse từ div.item (slide section "Top Ngày", "TRUYỆN NHÓM DỊCH")
        if (comics.isEmpty()) {
            Elements slideItems = doc.select("div.slide-home div.item");
            for (Element item : slideItems) {
                Map<String, String> comic = extractComicFromSlideItem(item, globalSeenUrls);
                if (comic != null) comics.add(comic);
            }
        }

        // CÁCH 3: Fallback tổng quát — quét tất cả link /truyen-*.html
        if (comics.isEmpty()) {
            Elements allLinks = doc.select("a[href*=/truyen-]");
            for (Element link : allLinks) {
                String url = link.attr("abs:href");
                if (url.isEmpty()) url = link.attr("href");
                if (!url.startsWith("http")) url = BASE_URL + (url.startsWith("/") ? "" : "/") + url;

                // Bỏ chapter links, chỉ lấy truyện chính (có .html)
                if (url.contains("/chuong-") || url.contains("/chapter-")) continue;
                if (!url.endsWith(".html")) continue;

                if (!globalSeenUrls.add(url)) continue;

                Element img = link.selectFirst("img");
                if (img == null) continue;

                String title = img.hasAttr("alt") && !img.attr("alt").isEmpty()
                    ? img.attr("alt")
                    : link.text().trim();
                if (title.isEmpty()) title = "Truyện SayHentai";

                String coverUrl = img.attr("src");
                if (coverUrl.isEmpty() || coverUrl.startsWith("data:")) coverUrl = img.attr("data-src");
                if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
                if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

                Map<String, String> comicObj = new HashMap<>();
                comicObj.put("url", url);
                comicObj.put("title", title);
                comicObj.put("coverUrl", coverUrl);
                comicObj.put("latestChapter", "N/A");
                comics.add(comicObj);
            }
        }

        return comics;
    }

    /**
     * Parse 1 card từ div.page-item-detail (listing chính + search results)
     * DOM:  
     *   div.page-item-detail
     *     div.item-thumb > a[href] > img.img-responsive
     *     div.item-summary > div.post-title > h3 > a[href] (title text)
     *     div.list-chapter > div.chapter-item > span.chapter > a.btn-link (chapter text)
     */
    private Map<String, String> extractComicFromCard(Element card, Set<String> seenUrls) {
        // Tìm link truyện
        Element titleLink = card.selectFirst(".post-title a[href], .item-thumb a[href]");
        if (titleLink == null) return null;

        String url = titleLink.attr("abs:href");
        if (url.isEmpty()) url = titleLink.attr("href");
        if (!url.startsWith("http")) url = BASE_URL + (url.startsWith("/") ? "" : "/") + url;

        // Bỏ qua link chapter
        if (url.contains("/chuong-") || url.contains("/chapter-")) return null;
        if (!seenUrls.add(url)) return null;

        // Title: ưu tiên .post-title a
        String title = "";
        Element postTitleA = card.selectFirst(".post-title a");
        if (postTitleA != null) title = postTitleA.text().trim();
        if (title.isEmpty()) {
            Element img = card.selectFirst("img");
            if (img != null) title = img.attr("alt");
        }
        if (title.isEmpty()) title = "Truyện SayHentai";

        // Cover image
        String coverUrl = "";
        Element img = card.selectFirst(".item-thumb img, img.img-responsive");
        if (img != null) {
            coverUrl = img.attr("src");
            if (coverUrl.isEmpty() || coverUrl.startsWith("data:")) {
                coverUrl = img.attr("data-src");
            }
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

        // Latest chapter
        String latestChapter = "N/A";
        Element chapLink = card.selectFirst(".list-chapter a.btn-link, .chapter-item a.btn-link");
        if (chapLink != null) {
            latestChapter = chapLink.text().trim();
        }

        Map<String, String> comicObj = new HashMap<>();
        comicObj.put("url", url);
        comicObj.put("title", title);
        comicObj.put("coverUrl", coverUrl);
        comicObj.put("latestChapter", latestChapter);
        return comicObj;
    }

    /**
     * Parse 1 card từ div.item (slide section)
     * DOM:
     *   div.item
     *     div.img-item > a[href] > img  +  span.chapter > a.btn-link
     *     div.info-item > div.line-2 > a  (title)
     */
    private Map<String, String> extractComicFromSlideItem(Element item, Set<String> seenUrls) {
        // Ignore quảng cáo
        if (item.hasClass("adsmobile") || item.hasClass("lhihi")) return null;

        Element link = item.selectFirst("a[href*=/truyen-]");
        if (link == null) return null;

        String url = link.attr("abs:href");
        if (url.isEmpty()) url = link.attr("href");
        if (!url.startsWith("http")) url = BASE_URL + (url.startsWith("/") ? "" : "/") + url;
        if (url.contains("/chuong-") || url.contains("/chapter-")) return null;
        if (!seenUrls.add(url)) return null;

        // Title: .line-2 a hoặc img[alt]
        String title = "";
        Element titleLink = item.selectFirst(".info-item .line-2 a, .line-2 a");
        if (titleLink != null) title = titleLink.text().trim();
        if (title.isEmpty()) {
            Element img = item.selectFirst("img");
            if (img != null) title = img.attr("alt");
        }
        if (title.isEmpty()) title = "Truyện SayHentai";

        // Cover
        String coverUrl = "";
        Element img = item.selectFirst("img.img-responsive, .img-item img");
        if (img != null) {
            coverUrl = img.attr("src");
            if (coverUrl.isEmpty() || coverUrl.startsWith("data:")) coverUrl = img.attr("data-src");
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

        // Latest chapter
        String latestChapter = "N/A";
        Element chapLink = item.selectFirst("a.btn-link");
        if (chapLink != null) {
            latestChapter = chapLink.text().trim();
        }

        Map<String, String> comicObj = new HashMap<>();
        comicObj.put("url", url);
        comicObj.put("title", title);
        comicObj.put("coverUrl", coverUrl);
        comicObj.put("latestChapter", latestChapter);
        return comicObj;
    }

    // =============================================
    // 3. LẤY CHI TIẾT TRUYỆN + DANH SÁCH CHAPTER
    // DOM thực tế SayHentai detail page:
    //   - Title: h1  hoặc  .post-title h1
    //   - Cover: meta[property=og:image]   hoặc  .summary_image img
    //   - Description: .description-summary  hoặc  .manga-excerpt
    //   - Author: text near "Tác giả"
    //   - Chapter list: ul.main > li > a[href*=/chuong-]
    //     URL pattern: /truyen-xxx/chuong-N
    // =============================================
    public Map<String, Object> getComicDetail(String url) throws IOException {
        Document doc = getDocument(url);

        Map<String, Object> detail = new HashMap<>();

        // === TITLE ===
        String rawTitle = "";
        Element h1 = doc.selectFirst(".post-title h1, h1");
        if (h1 != null && !h1.text().isEmpty()) {
            rawTitle = h1.text().trim();
        } else {
            rawTitle = doc.title().replace(" - SayHentai", "").trim();
        }
        detail.put("title", rawTitle);

        // === COVER IMAGE ===
        String coverUrl = "";
        // Ưu tiên 1: meta og:image (chính xác nhất)
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null && metaImg.hasAttr("content")) {
            coverUrl = metaImg.attr("content");
        }
        // Ưu tiên 2: img trong .summary_image
        if (coverUrl.isEmpty()) {
            Element coverImg = doc.selectFirst(".summary_image img, .tab-summary img");
            if (coverImg != null) {
                coverUrl = coverImg.attr("src");
                if (coverUrl.isEmpty() || coverUrl.startsWith("data:")) coverUrl = coverImg.attr("data-src");
            }
        }
        // Ưu tiên 3: img đầu tiên có src chứa /storage/images/cover/
        if (coverUrl.isEmpty()) {
            Elements imgs = doc.select("img[src*=/storage/images/cover/]");
            if (!imgs.isEmpty()) coverUrl = imgs.first().attr("src");
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;
        detail.put("coverUrl", coverUrl);

        // === DESCRIPTION ===
        String description = "Không có thông tin nội dung.";
        Element descEl = doc.selectFirst(".description-summary, .manga-excerpt, .summary__content");
        if (descEl != null && descEl.text().trim().length() > 10) {
            description = descEl.text().trim();
        } else {
            // Fallback: tìm trong meta description
            Element metaDesc = doc.selectFirst("meta[name=description]");
            if (metaDesc != null && metaDesc.hasAttr("content") && metaDesc.attr("content").length() > 20) {
                description = metaDesc.attr("content");
            }
        }
        detail.put("description", description);

        // === AUTHOR ===
        String author = "Đang cập nhật";
        // SayHentai hiển thị: <h5>Tác giả</h5> rồi text/link sau đó
        Elements h5s = doc.select("h5");
        for (Element h5 : h5s) {
            if (h5.text().toLowerCase().contains("tác giả")) {
                Element parent = h5.parent();
                if (parent != null) {
                    // Tìm text sau h5, có thể là trong span/a/div
                    String authorText = parent.text().replaceAll("(?i)tác giả\\s*:?\\s*", "").trim();
                    if (!authorText.isEmpty()) {
                        author = authorText;
                    }
                }
                break;
            }
        }
        // Fallback
        if (author.equals("Đang cập nhật")) {
            Element authorEl = doc.selectFirst(".author-content a");
            if (authorEl != null && !authorEl.text().isEmpty()) {
                author = authorEl.text().trim();
            }
        }
        detail.put("author", author);

        // === NHÓM DỊCH ===
        String translatorTeam = "";
        Element teamLink = doc.selectFirst("a[href*=/nhom-dich/]");
        if (teamLink != null) {
            translatorTeam = teamLink.text().trim();
        }
        if (!translatorTeam.isEmpty()) {
            detail.put("translatorTeam", translatorTeam);
        }

        // === THỂ LOẠI ===
        List<String> genres = new ArrayList<>();
        Elements genreLinks = doc.select("a[href*=/genre/]");
        for (Element gl : genreLinks) {
            String genreName = gl.text().trim();
            if (!genreName.isEmpty() && !genres.contains(genreName)
                && !genreName.equalsIgnoreCase("Manhwa") && !genreName.equalsIgnoreCase("Manga")
                && !genreName.equalsIgnoreCase("Thể Loại") && !genreName.equalsIgnoreCase("Random")) {
                genres.add(genreName);
            }
        }
        if (!genres.isEmpty()) {
            detail.put("genres", genres);
        }

        // ============================================
        // === CHAPTER LIST ===
        // Chapter links trong ul.main li a
        // hoặc: bất kỳ a[href*=/chuong-] thuộc truyện hiện tại
        // URL pattern: /truyen-slug/chuong-N
        // ============================================
        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();

        // Extract slug từ URL truyện
        String comicPath = url.replaceAll("https?://[^/]+", "").replaceAll("\\.html$", "");

        // Tìm chapter links
        Elements chapterLinks = doc.select("ul.main a[href*=/chuong-], .wp-manga-chapter a[href*=/chuong-], .list-chapter a[href*=/chuong-]");
        
        // Fallback: tìm tất cả link /chuong- trong DOM
        if (chapterLinks.isEmpty()) {
            chapterLinks = doc.select("a[href*=/chuong-]");
        }

        for (Element a : chapterLinks) {
            String href = a.attr("abs:href");
            if (href.isEmpty()) href = a.attr("href");
            if (!href.startsWith("http")) href = BASE_URL + (href.startsWith("/") ? "" : "/") + href;

            // Chỉ lấy chapter thuộc truyện hiện tại
            if (!href.contains(comicPath.replace(".html", ""))) continue;
            if (!seenChapUrls.add(href)) continue;

            Map<String, Object> chapMap = new HashMap<>();
            chapMap.put("url", href);

            String chapTitle = a.text().trim();

            // Extract số chapter từ URL: /chuong-N
            Matcher m = Pattern.compile("chuong-(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE).matcher(href);
            if (m.find()) {
                String numStr = m.group(1);
                try {
                    double numD = Double.parseDouble(numStr);
                    if (numD == (long) numD) {
                        chapMap.put("chapterNumber", (long) numD);
                    } else {
                        chapMap.put("chapterNumber", numD);
                    }
                } catch (Exception e) {
                    chapMap.put("chapterNumber", 0L);
                }
            } else {
                chapMap.put("chapterNumber", 0L);
            }

            if (chapTitle.isEmpty()) chapTitle = "Chapter " + chapMap.get("chapterNumber");
            chapMap.put("title", chapTitle);

            chapters.add(chapMap);
        }

        // Deduplicate by URL
        Map<String, Map<String, Object>> uniqueMap = new LinkedHashMap<>();
        for (Map<String, Object> ch : chapters) {
            uniqueMap.putIfAbsent((String) ch.get("url"), ch);
        }

        List<Map<String, Object>> finalChapters = new ArrayList<>(uniqueMap.values());

        // Sort ascending (1, 2, 3...)
        finalChapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        detail.put("chapters", finalChapters);

        return detail;
    }

    // =============================================
    // 4. LẤY ẢNH CHAPTER
    // =============================================
    public List<String> getChapterImages(String chapterUrl) throws IOException {
        Document doc = getDocument(chapterUrl);

        List<String> images = new ArrayList<>();

        // SayHentai chapter page: ảnh trong .reading-content img hoặc .chapter-content img
        Elements imgs = doc.select(".reading-detail img, .reading-content img, .page-break img, .chapter-content img");
        if (imgs.isEmpty()) {
            imgs = doc.select("img[id^=image-]");
            if (imgs.isEmpty()) imgs = doc.select("img");
        }

        for (Element img : imgs) {
            String src = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            if (src == null || src.isEmpty() || src.startsWith("data:")) continue;
            // Bỏ qua ảnh logo, avatar, icon, ads
            String lower = src.toLowerCase();
            if (lower.contains("logo") || lower.contains("avatar") || lower.contains("icon")
                || lower.contains("footer") || lower.contains("header") || lower.contains("ads")
                || lower.contains("banner") || lower.contains("favicon")) continue;

            if (src.startsWith("//")) src = "https:" + src;
            if (!images.contains(src.trim())) {
                images.add(src.trim());
            }
        }

        return images;
    }

    // =============================================
    // HELPER: GET DOCUMENT WITH PROXY FALLBACK
    // =============================================
    private Document getDocument(String url) throws IOException {
        // CÁCH 1: Kết nối trực tiếp
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                    .header("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")
                    .header("Referer", BASE_URL + "/")
                    .header("Cache-Control", "no-cache")
                    .header("Connection", "keep-alive")
                    .header("Sec-Fetch-Dest", "document")
                    .header("Sec-Fetch-Mode", "navigate")
                    .header("Upgrade-Insecure-Requests", "1")
                    .timeout(15000)
                    .get();
            if (doc.select("img").size() > 2 || doc.select("a").size() > 5) {
                return doc;
            }
            throw new IOException("Empty/blocked page");
        } catch (Exception e) {
            System.err.println("SayHentai direct failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }

        String encodedUrl;
        try {
            encodedUrl = java.net.URLEncoder.encode(url, "UTF-8");
        } catch (Exception e) {
            throw new IOException("Failed to encode URL", e);
        }

        // CÁCH 2: allorigins
        try {
            return Jsoup.connect("https://api.allorigins.win/raw?url=" + encodedUrl)
                    .userAgent(USER_AGENT).timeout(25000).get();
        } catch (Exception e) {
            System.err.println("AllOrigins failed for SayHentai: " + e.getMessage());
        }

        // CÁCH 3: corsproxy.io
        try {
            return Jsoup.connect("https://corsproxy.io/?" + encodedUrl)
                    .userAgent(USER_AGENT).timeout(25000).get();
        } catch (Exception e) {
            System.err.println("corsproxy.io failed for SayHentai: " + e.getMessage());
        }

        // CÁCH 4: codetabs
        try {
            return Jsoup.connect("https://api.codetabs.com/v1/proxy?quest=" + encodedUrl)
                    .userAgent(USER_AGENT).timeout(25000).get();
        } catch (Exception e) {
            System.err.println("codetabs failed for SayHentai: " + e.getMessage());
        }

        // CÁCH 5: thingproxy
        try {
            return Jsoup.connect("https://thingproxy.freeboard.io/fetch/" + url)
                    .userAgent(USER_AGENT).timeout(25000).get();
        } catch (Exception e) {
            System.err.println("thingproxy failed for SayHentai: " + e.getMessage());
        }

        throw new IOException("All proxy strategies failed for URL: " + url);
    }
}
