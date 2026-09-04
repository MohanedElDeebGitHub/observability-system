package com.mohaned.observability_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ObservabilitySystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(ObservabilitySystemApplication.class, args);
	}

}
