package com.mohaned.observability_system.producer;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.mohaned.observability_system.model.LogEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor 
public class LogProducer implements Producer{

    private final KafkaTemplate<String, LogEvent> kafkaTemplate;

    @Override 
    public void produce(LogEvent event) {
        kafkaTemplate.send("logs", event);
    }
}