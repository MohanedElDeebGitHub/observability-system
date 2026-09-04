package com.mohaned.observability_system.producer;

import org.springframework.stereotype.Service;

@Service
public class UserServiceProducer extends BaseServiceProducer {

    public UserServiceProducer(LogProducer logProducer) {
        super(logProducer);
    }

    @Override
    protected String getServiceName() {
        return "user-service";
    }

    @Override
    protected String generateMessage() {
        return "User created";
    }
}