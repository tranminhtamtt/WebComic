package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Map;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/ping")
public class PingController {

    private final DataSource dataSource;

    public PingController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());

        // Check memory usage
        Runtime runtime = Runtime.getRuntime();
        long usedMB = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        long maxMB = runtime.maxMemory() / (1024 * 1024);
        health.put("memory_used_mb", usedMB);
        health.put("memory_max_mb", maxMB);
        health.put("memory_percent", Math.round((double) usedMB / maxMB * 100));

        // Check DB connectivity
        try (Connection conn = dataSource.getConnection()) {
            health.put("database", "CONNECTED");
        } catch (Exception e) {
            health.put("database", "DISCONNECTED: " + e.getMessage());
        }

        return ResponseEntity.ok(health);
    }
}
