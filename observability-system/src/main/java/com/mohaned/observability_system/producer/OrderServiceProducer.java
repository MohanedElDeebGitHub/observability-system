package com.mohaned.observability_system.producer;

import org.springframework.stereotype.Service;

@Service
public class OrderServiceProducer extends BaseServiceProducer {

    public OrderServiceProducer(LogProducer logProducer) {
        super(logProducer);
    }

    @Override
    protected String getServiceName() {
        return "order-service";
    }

    @Override
    protected String generateMessage() {
        return "Order created";
    }
}