package com.example.demo.config;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        // Kiểm tra xem User "conca" đã tồn tại chưa
        Optional<User> adminOpt = userRepository.findByUsername("conca");

        if (adminOpt.isEmpty()) {
            User admin = User.builder()
                    .username("conca")
                    .email("admin@conca.com")
                    .passwordHash(HashUtil.hashSHA256("conca"))
                    .role("ADMIN")
                    .dob(LocalDate.now())
                    .build();

            userRepository.save(admin);
            System.out.println("====== ĐÃ KHỞI TẠO TÀI KHOẢN ADMIN: conca / conca ======");
        } else {
            // Check if password needs to be re-hashed if it's plain text 'conca' in old DB
            User existingAdmin = adminOpt.get();
            if ("conca".equals(existingAdmin.getPasswordHash())) {
                existingAdmin.setPasswordHash(HashUtil.hashSHA256("conca"));
                existingAdmin.setRole("ADMIN");
                userRepository.save(existingAdmin);
                System.out.println("====== ĐÃ CẬP NHẬT MẬT KHẨU HASH CHO ADMIN: conca ======");
            }
        }
    }
}
