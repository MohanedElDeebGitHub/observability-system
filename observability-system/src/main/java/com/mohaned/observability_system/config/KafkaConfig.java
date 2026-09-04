package com.mohaned.observability_system.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JacksonJsonDeserializer;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;

import com.mohaned.observability_system.model.LogEvent;

@Configuration 
public class KafkaConfig{
    
    @Bean
    public ProducerFactory<String, LogEvent> producerFactory() {
        Map<String, Object> config = new HashMap<>();

    config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
    config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JacksonJsonSerializer.class);

    return new DefaultKafkaProducerFactory<>(config);
    }


    @Bean
public KafkaTemplate<String, LogEvent> kafkaTemplate(
        ProducerFactory<String, LogEvent> producerFactory) {
    return new KafkaTemplate<>(producerFactory);
}

@Bean 
public NewTopic logsTopic(){
    return new NewTopic("logs", 3, (short) 1);
}

@Bean
public ConsumerFactory<String, LogEvent> consumerFactory() {
    Map<String, Object> config = new HashMap<>();

    config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
    config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JacksonJsonDeserializer.class);
    config.put(
    JacksonJsonDeserializer.TRUSTED_PACKAGES,
    "com.mohaned.observability_system.model"
);

    return new DefaultKafkaConsumerFactory<>(config);
}

@Bean
public ConcurrentKafkaListenerContainerFactory<String, LogEvent> kafkaListenerContainerFactory(
        ConsumerFactory<String, LogEvent> consumerFactory) {

    ConcurrentKafkaListenerContainerFactory<String, LogEvent> factory =
            new ConcurrentKafkaListenerContainerFactory<>();

    factory.setConsumerFactory(consumerFactory);

    return factory;
}
}