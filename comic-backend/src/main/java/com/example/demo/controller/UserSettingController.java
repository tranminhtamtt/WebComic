package com.example.demo.controller;

import com.example.demo.entity.UserSetting;
import com.example.demo.service.UserSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-settings")
@RequiredArgsConstructor
public class UserSettingController {

    private final UserSettingService userSettingService;

    @GetMapping
    public ResponseEntity<List<UserSetting>> getAll() {
        return ResponseEntity.ok(userSettingService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserSetting> getById(@PathVariable Long id) {
        return userSettingService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserSetting> save(@RequestBody UserSetting userSetting) {
        return ResponseEntity.ok(userSettingService.save(userSetting));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userSettingService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
