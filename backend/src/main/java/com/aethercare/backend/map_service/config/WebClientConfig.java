package com.aethercare.backend.map_service.config;

import com.aethercare.backend.map_service.common.MapConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient nominatimClient() {
        return WebClient.builder()
                .baseUrl(MapConstants.NOMINATIM_BASE_URL)
                .defaultHeader("User-Agent", MapConstants.USER_AGENT)
                .build();
    }
    
    @Bean
    public WebClient overpassClient() {
        return WebClient.builder()
                .baseUrl(MapConstants.OVERPASS_BASE_URL)
                .defaultHeader("User-Agent", MapConstants.USER_AGENT)
                .build();
    }
}