package com.mohaned.observability_system.model;

import java.time.Instant;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    private String serviceName;
    private String message;
    private LogLevel logLevel;
    private Instant timestamp;
}