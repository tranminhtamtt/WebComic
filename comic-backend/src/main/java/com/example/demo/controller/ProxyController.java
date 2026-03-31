package com.example.demo.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {

    @GetMapping
    public ResponseEntity<String> proxy(@RequestParam String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            connection.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            connection.setRequestProperty("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String html = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))
                    .lines()
                    .collect(Collectors.joining("\n"));
                return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
            } else {
                return ResponseEntity.status(responseCode).body("Proxy error: " + responseCode);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Proxy error: " + e.getMessage());
        }
    }

    /**
     * Proxy ảnh binary với Referer header đúng để bypass CDN hotlink protection.
     * Frontend gọi: /api/proxy/image?url=https://cdn.../img.jpg
     * Backend sẽ fetch ảnh với Referer gốc rồi trả về byte[] cho trình duyệt.
     */
    @GetMapping("/image")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String url) {
        try {
            // Extract domain for Referer header
            URI uri = new URI(url);
            String referer = uri.getScheme() + "://" + uri.getHost() + "/";

            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            connection.setRequestProperty("Referer", referer);
            connection.setRequestProperty("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
            connection.setRequestProperty("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setInstanceFollowRedirects(true);

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String contentType = connection.getContentType();
                if (contentType == null) contentType = "image/jpeg";

                InputStream is = connection.getInputStream();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                is.close();

                return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Cache-Control", "public, max-age=86400")
                    .body(baos.toByteArray());
            } else {
                return ResponseEntity.status(responseCode).build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
