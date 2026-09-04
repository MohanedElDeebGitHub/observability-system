package com.mohaned.observability_system.producer;

import org.springframework.stereotype.Service;

@Service
public class PaymentServiceProducer extends BaseServiceProducer {

    public PaymentServiceProducer(LogProducer logProducer) {
        super(logProducer);
    }

    @Override
    protected String getServiceName() {
        return "payment-service";
    }

    @Override
    protected String generateMessage() {
        return "Payment created";
    }
}