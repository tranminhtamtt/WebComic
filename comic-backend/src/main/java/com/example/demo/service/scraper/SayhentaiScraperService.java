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
                        Document doc = Jsoup.connect(fullUrl)
                                .userAgent(USER_AGENT)
                                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                                .header("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")
                                .header("Cache-Control", "no-cache")
                                .header("Connection", "keep-alive")
                                .timeout(20000)
                                .get();

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

        Elements blocks = doc.select(".page-item-detail, .item-summary, .post-title, .manga-item");
        if (blocks.isEmpty()) {
            blocks = doc.select("a[href*=truyen-]"); 
        }

        for (Element link : doc.select("a[href*=" + BASE_URL + "/truyen-], a[href^=/truyen-]")) {
            String url = link.attr("abs:href");

            // Bỏ qua link chapter 
            if (url.contains("/chuong-") || url.contains("/chapter-")) continue;

            if (!url.endsWith(".html") && !url.contains(".html")) {
                if (!url.matches(".*truyen-[^/]+/?$")) continue; // Avoid bad links
            }

            if (!globalSeenUrls.add(url)) continue;

            // Find an image anywhere near the link
            Element parent = link.parent();
            while (parent != null && parent.select("img").isEmpty() && parent.parent() != null && parent.parent().select("img").size() < 5) {
                parent = parent.parent();
            }
            if (parent == null) parent = link;
            
            Element img = parent.selectFirst("img");
            String coverUrl = "";
            if (img != null) {
                coverUrl = img.hasAttr("data-src") ? img.attr("data-src") : img.attr("src");
                if (coverUrl.contains("data:image") && img.hasAttr("data-original")) coverUrl = img.attr("data-original");
            }
            if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
            if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;

            String title = link.text().trim();
            if (title.isEmpty() && img != null && img.hasAttr("alt")) title = img.attr("alt");
            if (title.isEmpty()) title = "Truyện SayHentai";

            String latestChapter = "N/A";
            if (parent != null) {
                Elements chapterLinks = parent.select("a[href*=/chuong-], a[href*=/chapter-]");
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
                .timeout(20000)
                .get();

        Map<String, Object> detail = new HashMap<>();

        String rawTitle = doc.title().replace(" - SayHentai", "").trim();
        Element h1 = doc.selectFirst("h1");
        if (h1 != null && !h1.text().isEmpty()) {
            rawTitle = h1.text().trim();
        }
        detail.put("title", rawTitle);

        String coverUrl = "";
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null && metaImg.hasAttr("content")) {
            coverUrl = metaImg.attr("content");
        }
        if (coverUrl.isEmpty()) {
            Element img = doc.selectFirst(".summary_image img");
            if (img != null) coverUrl = img.attr("src");
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        if (coverUrl.startsWith("/")) coverUrl = BASE_URL + coverUrl;
        detail.put("coverUrl", coverUrl);

        String description = "Không có thông tin nội dung.";
        Element descEl = doc.selectFirst(".description-summary, .manga-excerpt, .post-content_item p");
        if (descEl != null) {
            description = descEl.text().trim();
        }
        detail.put("description", description);

        String author = "Đang cập nhật";
        Elements authorEls = doc.select(".author-content a");
        if (!authorEls.isEmpty()) {
            author = authorEls.text().trim();
        }
        detail.put("author", author);

        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();
        
        Elements chapterLinks = doc.select("a[href*=" + BASE_URL + "/truyen-], a[href^=/truyen-]");
        for (Element a : chapterLinks) {
            String href = a.attr("abs:href");
            if (!href.contains("/chuong-") && !href.contains("/chapter-")) continue;
            if (!seenChapUrls.add(href)) continue;

            Map<String, Object> chapMap = new HashMap<>();
            chapMap.put("url", href);
            
            String chapTitle = a.text().trim();

            Matcher m = Pattern.compile("(?:chapter|chuong|chương)[\\s\\-]*?(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE).matcher(chapTitle.isEmpty() ? href : chapTitle);
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
            chapMap.put("title", chapTitle.isEmpty() ? "Chapter " + chapMap.get("chapterNumber") : chapTitle);
            chapters.add(chapMap);
        }

        chapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        LinkedHashMap<Number, Map<String, Object>> uniqueChapters = new LinkedHashMap<>();
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
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .timeout(20000)
                .get();

        List<String> images = new ArrayList<>();

        Elements imgs = doc.select(".reading-content img, .page-break img");
        if (imgs.isEmpty()) {
            imgs = doc.select("img");
        }

        for (Element img : imgs) {
            String src = img.attr("data-src");
            if (src.isEmpty()) src = img.attr("src");
            if (src != null && !src.isEmpty() && !src.contains("logo") && !src.contains("avatar") && !src.startsWith("data:")) {
                images.add(src.trim());
            }
        }

        return images;
    }
}
