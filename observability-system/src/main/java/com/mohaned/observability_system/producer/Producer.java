package com.mohaned.observability_system.producer;
import com.mohaned.observability_system.model.LogEvent;

public interface Producer{
    void produce(LogEvent event);
}