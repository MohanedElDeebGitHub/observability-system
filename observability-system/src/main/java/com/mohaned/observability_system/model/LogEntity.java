package com.mohaned.observability_system.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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