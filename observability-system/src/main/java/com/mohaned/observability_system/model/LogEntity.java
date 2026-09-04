package com.mohaned.observability_system.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogEntity {

    @Id
    private UUID id;

    private String serviceName;

    private String message;

    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    private LogLevel logLevel;
}