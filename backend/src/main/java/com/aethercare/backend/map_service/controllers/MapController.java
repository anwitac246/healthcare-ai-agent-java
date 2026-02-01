package com.aethercare.backend.map_service.controllers;

import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.map_service.models.dto.GeocodeResponse;
import com.aethercare.backend.map_service.models.dto.NearbySearchResponse;
import com.aethercare.backend.map_service.services.MapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapController {
    
    private final MapService mapService;
    
    @GetMapping("/geocode")
    public ResponseEntity<ApiResponse<GeocodeResponse>> geocode(
            @RequestParam String query
    ) {
        log.info("Geocoding request for: {}", query);
        
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.success("Query parameter is required", null));
        }
        
        try {
            GeocodeResponse response = mapService.geocode(query.trim());
            
            if (!response.isSuccess()) {
                return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
            }
            
            log.info("Geocoding successful for: {}", query);
            return ResponseEntity.ok(ApiResponse.success(response));
            
        } catch (Exception e) {
            log.error("Geocoding failed for query: {}", query, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.success("Geocoding failed: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<NearbySearchResponse>> searchNearby(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(defaultValue = "5000") Integer radius,
            @RequestParam(required = false, defaultValue = "all") String type
    ) {
        log.info("Nearby search: lat={}, lon={}, radius={}, type={}", lat, lon, radius, type);
        
        // Validate inputs
        if (lat == null || lon == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.success("Latitude and longitude are required", null));
        }
        
        if (lat < -90 || lat > 90) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.success("Invalid latitude (must be between -90 and 90)", null));
        }
        
        if (lon < -180 || lon > 180) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.success("Invalid longitude (must be between -180 and 180)", null));
        }
        
        if (radius < 100 || radius > 50000) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.success("Invalid radius (must be between 100 and 50000 meters)", null));
        }
        
        try {
            NearbySearchResponse response = mapService.searchNearby(lat, lon, radius, type);
            
            if (!response.isSuccess()) {
                log.warn("Nearby search returned no results: {}", response.getMessage());
                return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
            }
            
            log.info("Nearby search successful: found {} places", response.getTotalResults());
            return ResponseEntity.ok(ApiResponse.success(response));
            
        } catch (Exception e) {
            log.error("Nearby search failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.success("Search failed: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Map service is running");
    }
}