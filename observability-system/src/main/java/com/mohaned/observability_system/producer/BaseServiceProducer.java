package com.mohaned.observability_system.producer;

import java.time.Instant;
import java.util.Random;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;

import com.mohaned.observability_system.model.LogEvent;
import com.mohaned.observability_system.model.LogLevel;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public abstract class BaseServiceProducer {

    private final LogProducer logProducer;

    protected abstract String getServiceName();

    protected abstract String generateMessage();

    @Scheduled(fixedDelay = 1000)
    public void generateEvent() {
        LogLevel logLevel = LogLevel.values()[
                new Random().nextInt(LogLevel.values().length)
        ];

        LogEvent event = LogEvent.builder()
                .id(UUID.randomUUID())
                .serviceName(getServiceName())
                .message(generateMessage())
                .timestamp(Instant.now())
                .logLevel(logLevel)
                .build();

        logProducer.produce(event);
    }
}