package com.mohaned.observability_system.model;

import lombok.*;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MetricsSnapshot {

    private long totalLogs;
    private long infoLogs;
    private long warnLogs;
    private long errorLogs;

    private Map<String, Long> logsByService;

    private double eventsPerSecond;
    private double errorRate;

    private Instant lastEventTimestamp;
}