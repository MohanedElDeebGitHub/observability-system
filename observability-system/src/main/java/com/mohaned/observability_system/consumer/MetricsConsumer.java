package com.mohaned.observability_system.consumer;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.mohaned.observability_system.model.LogEvent;
import com.mohaned.observability_system.model.LogLevel;
import com.mohaned.observability_system.model.MetricsSnapshot;
import com.mohaned.observability_system.sse.SseService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MetricsConsumer implements Consumer {

    private final SseService sseService;

    private long totalLogs = 0;
    private long infoLogs = 0;
    private long warnLogs = 0;
    private long errorLogs = 0;

    private final Map<String, Long> logsByService = new HashMap<>();

    private Instant lastEventTimestamp;
    private long previousSecond = Instant.now().getEpochSecond();
    private long eventsThisSecond = 0;

    @KafkaListener(topics = "logs", groupId = "metrics")
    @Override
    public void consume(LogEvent event) {

        totalLogs++;

        switch (event.getLogLevel()) {
            case INFO -> infoLogs++;
            case WARN -> warnLogs++;
            case ERROR -> errorLogs++;
        }

        logsByService.merge(
                event.getServiceName(),
                1L,
                Long::sum
        );

        lastEventTimestamp = event.getTimestamp();

        long currentSecond = Instant.now().getEpochSecond();

        if (currentSecond == previousSecond) {
            eventsThisSecond++;
        } else {
            previousSecond = currentSecond;
            eventsThisSecond = 1;
        }

        double errorRate = totalLogs == 0
                ? 0
                : (double) errorLogs / totalLogs * 100;

        MetricsSnapshot snapshot = MetricsSnapshot.builder()
                .totalLogs(totalLogs)
                .infoLogs(infoLogs)
                .warnLogs(warnLogs)
                .errorLogs(errorLogs)
                .logsByService(new HashMap<>(logsByService))
                .eventsPerSecond(eventsThisSecond)
                .errorRate(errorRate)
                .lastEventTimestamp(lastEventTimestamp)
                .build();

        sseService.send(snapshot);
    }
}