package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.HashUtil;
import com.example.demo.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // passwordHash field temporally holds the raw password sent from frontend
            String incomingHashed = HashUtil.hashSHA256(loginRequest.getPasswordHash());
            
            if (user.getPasswordHash().equals(incomingHashed)) {
                String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
                Map<String, Object> response = new HashMap<>();
                response.put("token", token);
                response.put("user", user);
                return ResponseEntity.ok(response);
            }
        }
        return ResponseEntity.status(401).body("Tài khoản hoặc mật khẩu không chính xác");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User registerUser) {
        if (userRepository.findByEmail(registerUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email này đã được sử dụng");
        }
        if (userRepository.findByUsername(registerUser.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Tên người dùng đã tồn tại");
        }
        String plainPassword = registerUser.getPasswordHash(); // sent as plain from frontend
        registerUser.setPasswordHash(HashUtil.hashSHA256(plainPassword));
        
        registerUser.setRole("USER");
        if (registerUser.getDob() == null) {
            registerUser.setDob(LocalDate.now());
        }
        
        User savedUser = userRepository.save(registerUser);
        return ResponseEntity.ok(savedUser);
    }
}
