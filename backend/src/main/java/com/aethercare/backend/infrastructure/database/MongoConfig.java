package com.aethercare.backend.infrastructure.database;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.aethercare.backend")
@EnableMongoAuditing
public class MongoConfig {
}