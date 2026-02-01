package com.aethercare.backend.map_service.services;

import com.aethercare.backend.map_service.common.MapConstants;
import com.aethercare.backend.map_service.models.dto.GeocodeResponse;
import com.aethercare.backend.map_service.models.dto.Location;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeocodingService {
    
    private final WebClient nominatimClient;
    
    public GeocodeResponse geocode(String query) {
        try {
            List<Map<String, Object>> results = nominatimClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .queryParam("format", "json")
                            .queryParam("limit", 1)
                            .build())
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();
            
            if (results == null || results.isEmpty()) {
                return GeocodeResponse.builder()
                        .success(false)
                        .message("No results found")
                        .build();
            }
            
            Map<String, Object> result = results.get(0);
            
            Location location = Location.builder()
                    .latitude(Double.parseDouble(result.get("lat").toString()))
                    .longitude(Double.parseDouble(result.get("lon").toString()))
                    .displayName(result.get("display_name").toString())
                    .build();
            
            return GeocodeResponse.builder()
                    .success(true)
                    .location(location)
                    .message("Geocoding successful")
                    .build();
                    
        } catch (Exception e) {
            log.error("Geocoding failed for query: {}", query, e);
            throw new RuntimeException("Geocoding failed: " + e.getMessage());
        }
    }
}