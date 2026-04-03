package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/image-proxy")
public class ImageProxyController {

    /**
     * Proxy ảnh binary với Referer header đúng để bypass CDN hotlink protection.
     * Frontend gọi: /api/image-proxy?url=https://cdn.../img.jpg
     * Backend sẽ fetch ảnh với Referer gốc rồi trả về byte[] cho trình duyệt.
     */
    @GetMapping
    public ResponseEntity<byte[]> proxyImage(@RequestParam String url) {
        try {
            // Extract domain for Referer header
            URI uri = new URI(url);
            String referer;
            if (url.contains("tnlycdn.com") || url.contains("toonily.com")) {
                referer = "https://toonily.com/";
            } else if (url.contains("baotangtruyen") || url.contains("sayhentai")) {
                referer = uri.getScheme() + "://" + uri.getHost() + "/"; // Vẫn giữ nguyên tuỳ biến nếu có
            } else {
                referer = uri.getScheme() + "://" + uri.getHost() + "/";
            }

            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .followRedirects(java.net.http.HttpClient.Redirect.NORMAL)
                .connectTimeout(java.time.Duration.ofSeconds(15))
                .build();
            
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Referer", referer)
                .header("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
                .GET()
                .build();

            java.net.http.HttpResponse<byte[]> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
            
            if (response.statusCode() == 200) {
                String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
                return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Cache-Control", "public, max-age=86400")
                    .body(response.body());
            } else {
                return ResponseEntity.status(response.statusCode()).build();
            }
        } catch (Exception e) {
            System.err.println("[ImageProxy] Proxy error for " + url + " : " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
