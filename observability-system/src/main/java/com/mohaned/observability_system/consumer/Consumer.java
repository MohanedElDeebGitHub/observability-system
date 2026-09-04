package com.mohaned.observability_system.consumer;

import com.mohaned.observability_system.model.LogEvent;

public interface Consumer {
    void consume(LogEvent event);
}