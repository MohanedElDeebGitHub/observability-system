package com.mohaned.observability_system.model;

import java.time.Instant;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class LogEvent{
    private UUID id;
    private String serviceName;
    private String message;
    private Instant timestamp;
    private LogLevel logLevel;

}