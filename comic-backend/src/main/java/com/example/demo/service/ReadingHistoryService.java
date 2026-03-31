package com.example.demo.service;

import com.example.demo.entity.ReadingHistory;
import com.example.demo.entity.ReadingHistoryId;
import com.example.demo.repository.ReadingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReadingHistoryService {

    private final ReadingHistoryRepository readingHistoryRepository;

    public List<ReadingHistory> findAll() {
        return readingHistoryRepository.findAll();
    }

    public Optional<ReadingHistory> findById(ReadingHistoryId id) {
        return readingHistoryRepository.findById(id);
    }

    public ReadingHistory save(ReadingHistory readingHistory) {
        return readingHistoryRepository.save(readingHistory);
    }

    public void deleteById(ReadingHistoryId id) {
        readingHistoryRepository.deleteById(id);
    }
    
    public List<ReadingHistory> getHistoryByUserId(Long userId) {
        return readingHistoryRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }
}
