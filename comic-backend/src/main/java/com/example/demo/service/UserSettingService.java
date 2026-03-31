package com.example.demo.service;

import com.example.demo.entity.UserSetting;
import com.example.demo.repository.UserSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserSettingService {

    private final UserSettingRepository userSettingRepository;

    public List<UserSetting> findAll() {
        return userSettingRepository.findAll();
    }

    public Optional<UserSetting> findById(Long id) {
        return userSettingRepository.findById(id);
    }

    public UserSetting save(UserSetting userSetting) {
        return userSettingRepository.save(userSetting);
    }

    public void deleteById(Long id) {
        userSettingRepository.deleteById(id);
    }
}
