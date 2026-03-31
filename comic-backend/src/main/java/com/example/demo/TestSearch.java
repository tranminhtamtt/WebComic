package com.example.demo;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

public class TestSearch {
    public static void main(String[] args) throws Exception {
        Document doc = Jsoup.connect("https://damconuong.blog/tim-kiem?keyword=con")
                .userAgent("Mozilla/5.0")
                .timeout(15000)
                .get();

        Elements links = doc.select("a[href^=https://damconuong.blog/truyen/]");
        System.out.println("Found " + links.size() + " total links.");
        int comics = 0;
        for (Element link : links) {
            String url = link.attr("href");
            Element img = link.selectFirst("img");
            if (img != null) {
                System.out.println("Comic: " + url + " | " + img.attr("src"));
                comics++;
            } else {
                // Why no image?
                // check if the a tag has text:
                System.out.println("NO IMG IN A TAG: " + url + " | Text: " + link.text().trim());
            }
        }
        System.out.println("Valid comics found: " + comics);
    }
}
