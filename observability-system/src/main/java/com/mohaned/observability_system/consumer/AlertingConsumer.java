package com.mohaned.observability_system.consumer;

import com.mohaned.observability_system.model.Alert;
import com.mohaned.observability_system.model.LogLevel;
import com.mohaned.observability_system.sse.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.mohaned.observability_system.model.LogEvent;

@Service
@RequiredArgsConstructor
public class AlertingConsumer implements Consumer {

    private final SseService sseService;

    @KafkaListener(topics = "logs", groupId = "alerting")
    @Override
    public void consume(LogEvent event) {

        if (event.getLogLevel() == LogLevel.ERROR) {

            Alert alert = Alert.builder()
                    .serviceName(event.getServiceName())
                    .message(event.getMessage())
                    .logLevel(event.getLogLevel())
                    .timestamp(event.getTimestamp())
                    .build();

            sseService.send(alert);
        }
    }
}