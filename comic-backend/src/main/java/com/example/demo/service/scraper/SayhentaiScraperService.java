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
    // 1. LẤY DANH SÁCH TRUYỆN
    // =============================================
    public List<Map<String, String>> getComicsList(String type) {
        String path;
        if ("hot".equalsIgnoreCase(type)) {
            path = "/?page="; // Default view since sayhentai top lists are embedded or we could use /genre/manhwa
        } else if ("completed".equalsIgnoreCase(type)) {
            path = "/completed?page=";
        } else {
            path = "/?page="; 
        }
        return fetchMultiplePages(path, MAX_PAGES);
    }

    // =============================================
    // 2. TÌM KIẾM TRUYỆN
    // =============================================
    public List<Map<String, String>> searchComic(String query) {
        try {
            String safeQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
            // SayHentai search parameter is ?s=
            return fetchMultiplePages("/?s=" + safeQuery + "&page=", 2);
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
    // =============================================
    private List<Map<String, String>> parseComicCards(Document doc, Set<String> globalSeenUrls) {
        List<Map<String, String>> comics = new ArrayList<>();

        Elements cards = doc.select(".page-item-detail, .item.col-4");
        for (Element card : cards) {
            Element link = card.selectFirst("a[href*=/truyen-]");
            if (link == null) continue;
            String url = link.attr("abs:href");
            if (url.contains("/chuong-") || url.contains("/chapter-")) continue;
            if (!globalSeenUrls.add(url)) continue;

            String title = link.hasAttr("title") ? link.attr("title").trim() : link.text().trim();
            if (title.isEmpty()) {
                Element h3 = card.selectFirst(".post-title a, .line-2 a");
                if (h3 != null) title = h3.text().trim();
            }
            if (title.isEmpty()) title = "Truyện SayHentai";

            Element img = card.selectFirst("img");
            String coverUrl = "";
            if (img != null) {
                coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
                if (coverUrl.contains("data:image") && img.hasAttr("data-original")) coverUrl = img.attr("data-original");
            }
            if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
            if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

            String latestChapter = "N/A";
            Element chap = card.selectFirst(".chapter-item a, .chapter a, .chapter-item span, .chapter span");
            if (chap != null) {
                latestChapter = chap.text().trim();
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
        Document doc = getDocument(url);

        Map<String, Object> detail = new HashMap<>();

        String rawTitle = doc.title().replace(" - SayHentai", "").trim();
        Element h1 = doc.selectFirst(".post-title h1, h1");
        if (h1 != null && !h1.text().isEmpty()) {
            rawTitle = h1.text().trim();
        }
        detail.put("title", rawTitle);

        String coverUrl = "";
        Element img = doc.selectFirst(".summary_image img");
        if (img != null) {
            coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
        }
        if (coverUrl.isEmpty()) {
            Element metaImg = doc.selectFirst("meta[property=og:image]");
            if (metaImg != null && metaImg.hasAttr("content")) coverUrl = metaImg.attr("content");
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;
        detail.put("coverUrl", coverUrl);

        String description = "Không có thông tin nội dung.";
        Element descEl = doc.selectFirst(".description-summary, .summary__content, .manga-excerpt");
        if (descEl != null) {
            description = descEl.text().trim();
        }
        detail.put("description", description);

        String author = "Đang cập nhật";
        Element authorEl = doc.selectFirst(".author-content a");
        if (authorEl != null) {
            author = authorEl.text().trim();
        }
        detail.put("author", author);

        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();
        
        Elements chapterLinks = doc.select(".wp-manga-chapter a, .list-chapter a");
        for (Element a : chapterLinks) {
            String href = a.attr("abs:href");
            if (!href.contains("/chuong-") && !href.contains("/chapter-")) continue;
            if (!seenChapUrls.add(href)) continue;

            Map<String, Object> chapMap = new HashMap<>();
            chapMap.put("url", href);
            
            String chapTitle = a.text().trim();

            Matcher m = Pattern.compile("(?i)(?:chapter|chap|chuong|chương|tập|vol)[\\s\\-_]*?(\\d+(?:\\.\\d+)?)").matcher(chapTitle);
            if (!m.find()) {
                m = Pattern.compile("(?i)(?:chapter|chap|chuong|chương|tập|vol)[\\s\\-_]*?(\\d+(?:\\.\\d+)?)").matcher(href);
            }
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
            // Some titles are just "Chapter 1", let's use the full text if available
            chapMap.put("title", chapTitle.isEmpty() ? "Chapter " + chapMap.get("chapterNumber") : chapTitle);
            chapters.add(chapMap);
        }

        // Deduplicate using URL, not longValue which mangles 1.5 -> 1
        Map<String, Map<String, Object>> uniqueChaptersMap = new LinkedHashMap<>();
        for (Map<String, Object> ch : chapters) {
            String u = (String) ch.get("url");
            uniqueChaptersMap.putIfAbsent(u, ch);
        }
        
        List<Map<String, Object>> finalChapters = new ArrayList<>(uniqueChaptersMap.values());
        
        // Sort ascending
        finalChapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            if (n1.doubleValue() == n2.doubleValue()) {
                return 0;
            }
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

        Elements imgs = doc.select(".reading-detail img, .reading-content img, .page-break img, .chapter-content img");
        if (imgs.isEmpty()) {
            imgs = doc.select("img[id^=image-]"); // sometimes they use ids for images
            if (imgs.isEmpty()) imgs = doc.select("img");
        }

        for (Element img : imgs) {
            String src = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
            if (src == null || src.isEmpty() || src.contains("logo") || src.contains("avatar") || src.startsWith("data:")) continue;
            images.add(src.trim());
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
