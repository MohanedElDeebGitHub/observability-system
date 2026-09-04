package com.mohaned.observability_system.repository;

import com.mohaned.observability_system.model.LogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LogRepository extends JpaRepository<LogEntity, UUID> {

}
