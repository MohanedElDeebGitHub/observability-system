package com.mohaned.observability_system.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.mohaned.observability_system.model.LogEntity;
import com.mohaned.observability_system.model.LogEvent;
import com.mohaned.observability_system.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StorageConsumer implements Consumer {
    private final LogRepository logRepository;

    
    @KafkaListener(topics = "logs", groupId = "storage")
    @Override
    public void consume(LogEvent event) {
    
        LogEntity log = LogEntity.builder()
                .id(event.getId())
                .serviceName(event.getServiceName())
                .message(event.getMessage())
                .timestamp(event.getTimestamp())
                .logLevel(event.getLogLevel())
                .build();

        logRepository.save(log);

    }
}