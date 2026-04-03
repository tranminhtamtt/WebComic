package com.example.demo.service.scraper;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Toonily.com Scraper Service
 * ─────────────────────────────────────────────────────────────
 * Toonily dung WordPress Madara theme.
 *
 * FAMILY MODE BYPASS:
 *   - Cookie:  toonily-mature=1  -> hien thi truyen 18+ (Family Mode OFF)
 *
 * URL Patterns:
 *   Listing :  https://toonily.com/manga/?m_orderby=new&page=N
 *   Detail  :  https://toonily.com/serie/[slug]/
 *   Chapter :  https://toonily.com/serie/[slug]/[chapter-slug]/
 *
 * CSS Selectors (Madara theme):
 *   Cards    : div.page-item-detail
 *   Title    : .post-title h3 a
 *   Cover    : .item-thumb img  (data-src lazy-load)
 *   Chapters : li.wp-manga-chapter a
 *   Images   : .reading-content .page-break img
 * ─────────────────────────────────────────────────────────────
 */
@Service
public class TooNilyScraperService {

    private static final String BASE_URL = "https://toonily.com";
    private static final String USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private static final String MATURE_COOKIE_KEY   = "toonily-mature";
    private static final String MATURE_COOKIE_VALUE = "1";
    // Giảm xuống 2 trang — ít request hơn, phản hồi nhanh hơn
    private static final int    MAX_PAGES = 2;

    // =========================================================
    // 1. LAY DANH SACH TRUYEN
    // =========================================================
    public List<Map<String, String>> getComicsList(String type) {
        String pathFormat;
        switch (type == null ? "latest" : type.toLowerCase()) {
            case "hot": case "views":
                pathFormat = "/serie/page/%d/?m_orderby=views"; break;
            case "completed":
                pathFormat = "/serie/page/%d/?status=end&m_orderby=new"; break;
            case "rating":
                pathFormat = "/serie/page/%d/?m_orderby=rating"; break;
            case "trending":
                pathFormat = "/serie/page/%d/?m_orderby=trending"; break;
            default:
                pathFormat = "/serie/page/%d/?m_orderby=new";
        }
        try {
            return fetchMultiplePages(pathFormat, MAX_PAGES);
        } catch (Exception e) {
            System.err.println("[Toonily] getComicsList total fail: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    // =========================================================
    // 2. TIM KIEM TRUYEN
    // =========================================================
    public List<Map<String, String>> searchComic(String query) {
        try {
            String safeQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
            Document doc = getDocument(BASE_URL + "/?s=" + safeQuery + "&post_type=wp-manga");
            return parseComicCards(doc, new HashSet<>());
        } catch (Exception e) {
            System.err.println("[Toonily] Search error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    // =========================================================
    // HELPER: Fetch trang theo thứ tự tuần tự (không song song — tránh CompletionException)
    // =========================================================
    private List<Map<String, String>> fetchMultiplePages(String pathFormat, int maxPages) {
        List<Map<String, String>> allComics = new ArrayList<>();
        Set<String> seenUrls = new HashSet<>();

        for (int page = 1; page <= maxPages; page++) {
            try {
                // Hỗ trợ format "%d" nếu có, ngược lại gắn vào cuối chuỗi
                String fullPath = pathFormat.contains("%d") ? String.format(pathFormat, page) : pathFormat + page;
                Document doc = getDocument(BASE_URL + fullPath);
                List<Map<String, String>> pageComics = parseComicCards(doc, seenUrls);
                allComics.addAll(pageComics);
                System.out.println("[Toonily] Page " + page + ": " + pageComics.size() + " comics found");
                // Nếu trang đầu đã có data thì không cần tải thêm
                if (page == 1 && !pageComics.isEmpty()) {
                    System.out.println("[Toonily] Got " + pageComics.size() + " items from page 1, continuing...");
                }
            } catch (Exception e) {
                System.err.println("[Toonily] Skip page " + page + ": " + e.getMessage());
                // Không throw — tiếp tục trang tiếp theo
            }
        }

        System.out.println("[Toonily] Total fetched: " + allComics.size() + " comics");
        return allComics;
    }

    // =========================================================
    // HELPER: Parse comic cards (Madara theme)
    // =========================================================
    private List<Map<String, String>> parseComicCards(Document doc, Set<String> globalSeenUrls) {
        List<Map<String, String>> comics = new ArrayList<>();

        Elements cards = doc.select("div.page-item-detail");
        for (Element card : cards) {
            Map<String, String> comic = extractComicFromCard(card, globalSeenUrls);
            if (comic != null) comics.add(comic);
        }

        if (comics.isEmpty()) {
            Elements tabCards = doc.select("div.c-tabs-item__content");
            for (Element card : tabCards) {
                Map<String, String> comic = extractComicFromCard(card, globalSeenUrls);
                if (comic != null) comics.add(comic);
            }
        }

        if (comics.isEmpty()) {
            Elements allLinks = doc.select("a[href*=/serie/]");
            for (Element link : allLinks) {
                String url = link.attr("abs:href");
                if (url.isEmpty()) url = BASE_URL + link.attr("href");
                if (url.contains("/chapter-")) continue;
                if (!url.matches(".*toonily\\.com/serie/[^/]+/?$")) continue;
                if (!globalSeenUrls.add(url)) continue;

                Element img = link.selectFirst("img");
                if (img == null) continue;

                String title = img.hasAttr("alt") ? img.attr("alt").trim() : link.text().trim();
                if (title.isEmpty()) title = "Unknown Toonily Comic";

                Map<String, String> comicObj = new HashMap<>();
                comicObj.put("url", url);
                comicObj.put("title", title);
                comicObj.put("coverUrl", getCoverUrl(img));
                comicObj.put("latestChapter", "N/A");
                comics.add(comicObj);
            }
        }

        return comics;
    }

    private Map<String, String> extractComicFromCard(Element card, Set<String> seenUrls) {
        Element titleLink = card.selectFirst(".post-title a, .item-thumb a, .manga-name a");
        if (titleLink == null) return null;

        String url = titleLink.attr("abs:href");
        if (url.isEmpty()) url = BASE_URL + titleLink.attr("href");
        if (url.contains("/chapter-")) return null;
        if (!seenUrls.add(url)) return null;

        String title = "";
        Element titleEl = card.selectFirst(".post-title a, .manga-name a");
        if (titleEl != null) title = titleEl.text().trim();
        if (title.isEmpty()) {
            Element img = card.selectFirst("img");
            if (img != null) title = img.attr("alt").trim();
        }
        if (title.isEmpty()) title = "Unknown Toonily Comic";

        Element img = card.selectFirst(".item-thumb img, img.img-responsive, img");
        String coverUrl = img != null ? getCoverUrl(img) : "";

        String latestChapter = "N/A";
        Element chapLink = card.selectFirst(".chapter-item a, .list-chapter a, a.btn-link");
        if (chapLink != null) latestChapter = chapLink.text().trim();

        Map<String, String> comicObj = new HashMap<>();
        comicObj.put("url", url);
        comicObj.put("title", title);
        comicObj.put("coverUrl", coverUrl);
        comicObj.put("latestChapter", latestChapter);
        return comicObj;
    }

    // =========================================================
    // 3. LAY CHI TIET TRUYEN + DANH SACH CHAPTER
    // =========================================================
    public Map<String, Object> getComicDetail(String url) throws IOException {
        Document doc = getDocument(url);
        Map<String, Object> detail = new HashMap<>();

        // TITLE
        String title = "";
        Element h1 = doc.selectFirst(".post-title h1, .manga-title h1, h1");
        if (h1 != null) title = h1.text().trim();
        if (title.isEmpty()) {
            Element meta = doc.selectFirst("meta[property=og:title]");
            if (meta != null) title = meta.attr("content").replaceAll("\\s*[-|].*Toonily.*$", "").trim();
        }
        if (title.isEmpty()) title = doc.title().replaceAll("\\s*[-|].*Toonily.*$", "").trim();
        detail.put("title", title);

        // COVER
        String coverUrl = "";
        Element metaImg = doc.selectFirst("meta[property=og:image]");
        if (metaImg != null) coverUrl = metaImg.attr("content").trim();
        if (coverUrl.isEmpty()) {
            Element coverEl = doc.selectFirst(".summary_image img, .tab-summary img");
            if (coverEl != null) coverUrl = getCoverUrl(coverEl);
        }
        if (coverUrl.isEmpty()) {
            Elements imgs = doc.select("img[src*=/wp-content/uploads/]");
            if (!imgs.isEmpty()) coverUrl = getCoverUrl(imgs.first());
        }
        if (coverUrl.startsWith("//")) coverUrl = "https:" + coverUrl;
        detail.put("coverUrl", coverUrl);

        // DESCRIPTION
        String description = "Khong co thong tin.";
        Element descEl = doc.selectFirst(".description-summary .summary__content, .summary__content, .description-summary");
        if (descEl != null) {
            descEl.select(".show-more, .chapter-readmore, button").remove();
            String text = descEl.text().trim();
            if (text.length() > 15) description = text;
        }
        if ("Khong co thong tin.".equals(description)) {
            Element metaDesc = doc.selectFirst("meta[name=description]");
            if (metaDesc != null && metaDesc.attr("content").length() > 20)
                description = metaDesc.attr("content").trim();
        }
        detail.put("description", description);

        // AUTHOR / ARTIST
        String author = extractPostInfo(doc, "author");
        String artist = extractPostInfo(doc, "artist");
        detail.put("author", author.isEmpty() ? "Dang cap nhat" : author);
        if (!artist.isEmpty()) detail.put("artist", artist);

        // STATUS
        String status = "";
        Element statusEl = doc.selectFirst(".post-status .summary-content");
        if (statusEl != null) status = statusEl.text().trim();
        if (status.isEmpty()) status = extractPostInfo(doc, "status");
        detail.put("status", status);

        // GENRES
        List<String> genres = new ArrayList<>();
        for (Element gl : doc.select(".genres-content a, .category-list a")) {
            String g = gl.text().trim();
            if (!g.isEmpty() && !genres.contains(g)) genres.add(g);
        }
        if (!genres.isEmpty()) detail.put("genres", genres);

        // TAGS
        List<String> tags = new ArrayList<>();
        for (Element tl : doc.select(".tags-content a, .manga-tag a")) {
            String t = tl.text().trim();
            if (!t.isEmpty() && !tags.contains(t)) tags.add(t);
        }
        if (!tags.isEmpty()) detail.put("tags", tags);

        // ADULT FLAG
        boolean isAdult = genres.stream().anyMatch(g ->
            g.equalsIgnoreCase("Adult") || g.equalsIgnoreCase("Mature") ||
            g.equalsIgnoreCase("Hentai") || g.equalsIgnoreCase("Smut") ||
            g.equalsIgnoreCase("Ecchi"));
        detail.put("isAdult", isAdult);

        // CHAPTER LIST
        List<Map<String, Object>> chapters = new ArrayList<>();
        Set<String> seenChapUrls = new HashSet<>();
        String comicSlug = extractSlug(url);

        Elements chapterItems = doc.select("li.wp-manga-chapter");
        if (!chapterItems.isEmpty()) {
            for (Element li : chapterItems) {
                Element a = li.selectFirst("a");
                if (a == null) continue;
                String href = a.attr("abs:href");
                if (href.isEmpty()) href = BASE_URL + a.attr("href");
                if (!seenChapUrls.add(href)) continue;
                if (!comicSlug.isEmpty() && !href.contains(comicSlug)) continue;
                Map<String, Object> chap = buildChapterMap(a, href);
                if (chap != null) chapters.add(chap);
            }
        }

        if (chapters.isEmpty()) {
            for (Element a : doc.select("a[href*=/serie/][href*=/chapter-]")) {
                String href = a.attr("abs:href");
                if (href.isEmpty()) href = BASE_URL + a.attr("href");
                if (!comicSlug.isEmpty() && !href.contains(comicSlug)) continue;
                if (!seenChapUrls.add(href)) continue;
                Map<String, Object> chap = buildChapterMap(a, href);
                if (chap != null) chapters.add(chap);
            }
        }

        chapters.sort((c1, c2) -> {
            Number n1 = (Number) c1.get("chapterNumber");
            Number n2 = (Number) c2.get("chapterNumber");
            return Double.compare(n1.doubleValue(), n2.doubleValue());
        });

        detail.put("chapters", chapters);
        return detail;
    }

    // =========================================================
    // 4. LAY ANH CHAPTER
    // =========================================================
    public List<String> getChapterImages(String chapterUrl) throws IOException {
        Document doc = getDocument(chapterUrl);
        List<String> images = new ArrayList<>();

        Elements imgs = doc.select(".reading-content .page-break img, .reading-content img");
        if (imgs.isEmpty()) imgs = doc.select(".entry-content img, img[id^=image-]");
        if (imgs.isEmpty()) imgs = doc.select("img");

        for (Element img : imgs) {
            String src = getBestImageSrc(img);
            if (src == null || src.isEmpty()) continue;
            if (!isValidChapterImage(src)) continue;
            if (src.startsWith("//")) src = "https:" + src;
            else if (src.startsWith("/")) src = BASE_URL + src;
            if (!images.contains(src)) images.add(src);
        }

        if (images.size() <= 1) {
            String rawHtml = doc.outerHtml();
            Matcher m = Pattern.compile(
                "(https?:\\/\\/[^\"'\\s<>]+?\\.(?:jpg|jpeg|png|webp)(?:\\?[^\"'\\s<>]*)?)",
                Pattern.CASE_INSENSITIVE
            ).matcher(rawHtml);
            while (m.find()) {
                String matchUrl = m.group(1).replace("\\/", "/").trim();
                if (isValidChapterImage(matchUrl) && !images.contains(matchUrl))
                    images.add(matchUrl);
            }
        }

        System.out.println("[Toonily] Chapter images: " + images.size());
        return images;
    }

    // =========================================================
    // 5. LAY TRUYEN THEO THE LOAI
    // =========================================================
    public List<Map<String, String>> getComicsByGenre(String genreSlug, int maxPages) {
        return fetchMultiplePages("/manga-genre/" + genreSlug + "/?page=", Math.min(maxPages, 10));
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    private Document getDocument(String url) throws IOException {
        // STRATEGY 1: Direct + mature cookie (Jsoup / HttpURLConnection)
        try {
            Document doc = buildConnection(url).cookie(MATURE_COOKIE_KEY, MATURE_COOKIE_VALUE).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] Direct OK: " + url);
                return doc;
            }
        } catch (Exception e) {
            System.err.println("[Toonily] Direct fail: " + e.getMessage());
        }

        // STRATEGY 1.5: Java 11 HttpClient (Bypass Cloudflare tốt hơn HttpURLConnection)
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .followRedirects(java.net.http.HttpClient.Redirect.NORMAL)
                .connectTimeout(java.time.Duration.ofSeconds(15))
                .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .header("Cookie", MATURE_COOKIE_KEY + "=" + MATURE_COOKIE_VALUE)
                .GET()
                .build();
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            Document doc = Jsoup.parse(response.body(), url);
            if (isValidPage(doc)) {
                System.out.println("[Toonily] HttpClient OK: " + url);
                return doc;
            } else {
                System.err.println("[Toonily] HttpClient fail: Empty/Blocked page");
            }
        } catch (Exception e) {
            System.err.println("[Toonily] HttpClient fail: " + e.getMessage());
        }

        String enc;
        try {
            enc = URLEncoder.encode(url, StandardCharsets.UTF_8.toString());
        } catch (Exception e) {
            enc = url.replace(":", "%3A").replace("/", "%2F").replace("?", "%3F").replace("&", "%26");
        }

        // STRATEGY 2: Google Web Cache (bypass Cloudflare phổ biến nhất)
        try {
            String cacheUrl = "https://webcache.googleusercontent.com/search?q=cache:" + enc;
            Document doc = Jsoup.connect(cacheUrl)
                .userAgent(USER_AGENT)
                .header("Accept", "text/html,*/*")
                .timeout(12000).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] Google Cache OK: " + url);
                return doc;
            }
        } catch (Exception e) { System.err.println("[Toonily] google-cache fail: " + e.getMessage()); }

        // STRATEGY 3: allorigins
        try {
            Document doc = Jsoup.connect("https://api.allorigins.win/raw?url=" + enc)
                .userAgent(USER_AGENT).header("Accept", "text/html,*/*").timeout(12000).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] allorigins OK");
                return doc;
            }
        } catch (Exception e) { System.err.println("[Toonily] allorigins fail: " + e.getMessage()); }

        // STRATEGY 4: corsproxy.io
        try {
            Document doc = Jsoup.connect("https://corsproxy.io/?" + enc)
                .userAgent(USER_AGENT).header("Accept", "text/html,*/*").timeout(12000).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] corsproxy OK");
                return doc;
            }
        } catch (Exception e) { System.err.println("[Toonily] corsproxy fail: " + e.getMessage()); }

        // STRATEGY 5: codetabs
        try {
            Document doc = Jsoup.connect("https://api.codetabs.com/v1/proxy?quest=" + enc)
                .userAgent(USER_AGENT).header("Accept", "text/html,*/*").timeout(12000).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] codetabs OK");
                return doc;
            }
        } catch (Exception e) { System.err.println("[Toonily] codetabs fail: " + e.getMessage()); }

        // STRATEGY 6: thingproxy
        try {
            Document doc = Jsoup.connect("https://thingproxy.freeboard.io/fetch/" + url)
                .userAgent(USER_AGENT).header("Accept", "text/html,*/*").timeout(12000).get();
            if (isValidPage(doc)) {
                System.out.println("[Toonily] thingproxy OK");
                return doc;
            }
        } catch (Exception e) { System.err.println("[Toonily] thingproxy fail: " + e.getMessage()); }

        throw new IOException("[Toonily] All strategies failed for: " + url);
    }

    private Connection buildConnection(String url) {
        return Jsoup.connect(url)
            .userAgent(USER_AGENT)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.9")
            .header("Accept-Encoding", "gzip, deflate, br")
            .header("Referer", BASE_URL + "/")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\"")
            .header("Sec-Ch-Ua-Mobile", "?0")
            .header("Sec-Ch-Ua-Platform", "\"Windows\"")
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .header("Upgrade-Insecure-Requests", "1")
            .followRedirects(true)
            .timeout(15000);
    }

    private boolean isValidPage(Document doc) {
        return doc.select(".page-item-detail").size() > 0
            || doc.select("li.wp-manga-chapter").size() > 0
            || doc.select(".reading-content").size() > 0
            || doc.select(".summary_image").size() > 0
            || doc.select(".post-title").size() > 0;
    }

    private String getCoverUrl(Element img) {
        if (img == null) return "";
        for (String attr : new String[]{"data-src", "data-lazy-src", "data-cfsrc", "src"}) {
            String val = img.attr(attr);
            if (val != null && !val.isEmpty() && !val.startsWith("data:")) {
                if (val.startsWith("//")) return "https:" + val;
                if (val.startsWith("/")) return BASE_URL + val;
                return val;
            }
        }
        return "";
    }

    private String getBestImageSrc(Element img) {
        for (String attr : new String[]{"data-src", "data-lazy-src", "data-cfsrc", "data-original", "src"}) {
            String val = img.attr(attr);
            if (val != null && !val.isEmpty() && !val.startsWith("data:")) return val.trim();
        }
        return null;
    }

    private boolean isValidChapterImage(String src) {
        if (src == null || src.isEmpty()) return false;
        String lower = src.toLowerCase();
        if (lower.contains("logo") || lower.contains("avatar") || lower.contains("favicon")
            || lower.contains("icon") || lower.contains("footer") || lower.contains("header")
            || lower.contains("ads") || lower.contains("banner") || lower.contains("patreon")
            || lower.contains("discord") || lower.contains("spinner")) return false;
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            || lower.endsWith(".png") || lower.endsWith(".webp")
            || lower.contains(".jpg?") || lower.contains(".png?") || lower.contains(".webp?");
    }

    private String extractSlug(String url) {
        String path = url.replaceAll("https?://[^/]+", "").replaceAll("/$", "");
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].equals("serie") && i + 1 < parts.length) return parts[i + 1];
        }
        return "";
    }

    private String extractPostInfo(Document doc, String fieldName) {
        for (Element item : doc.select(".post-content_item")) {
            Element heading = item.selectFirst(".summary-heading h5");
            if (heading == null) continue;
            if (heading.text().toLowerCase().contains(fieldName)) {
                Element content = item.selectFirst(".summary-content");
                if (content != null) {
                    Elements links = content.select("a");
                    if (!links.isEmpty()) {
                        return links.stream()
                            .map(a -> a.text().trim())
                            .filter(t -> !t.isEmpty())
                            .collect(Collectors.joining(", "));
                    }
                    return content.text().trim();
                }
            }
        }
        return "";
    }

    private Map<String, Object> buildChapterMap(Element a, String href) {
        Map<String, Object> chapMap = new HashMap<>();
        chapMap.put("url", href);

        String chapText = a.text().trim();
        Matcher m = Pattern.compile("chapter[/-](\\d+(?:[.-]\\d+)?)", Pattern.CASE_INSENSITIVE).matcher(href);
        if (m.find()) {
            String numStr = m.group(1).replace("-", ".");
            try {
                double numD = Double.parseDouble(numStr);
                chapMap.put("chapterNumber", numD == Math.floor(numD) ? (long) numD : numD);
            } catch (Exception e) {
                chapMap.put("chapterNumber", 0L);
            }
        } else {
            chapMap.put("chapterNumber", 0L);
        }

        if (chapText.isEmpty()) chapText = "Chapter " + chapMap.get("chapterNumber");
        chapMap.put("title", chapText);

        Element dateEl = a.parent() != null ? a.parent().selectFirst(".chapter-release-date i") : null;
        if (dateEl != null) chapMap.put("releaseDate", dateEl.text().trim());

        return chapMap;
    }
}
