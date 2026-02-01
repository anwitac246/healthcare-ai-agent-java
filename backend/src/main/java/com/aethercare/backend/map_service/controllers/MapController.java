package com.aethercare.backend.map_service.controllers;

import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.map_service.models.dto.GeocodeResponse;
import com.aethercare.backend.map_service.models.dto.NearbySearchResponse;
import com.aethercare.backend.map_service.services.MapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
        
        try {
            GeocodeResponse response = mapService.geocode(query);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Geocoding failed", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.success("Geocoding failed: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<NearbySearchResponse>> searchNearby(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(defaultValue = "5000") Integer radius,
            @RequestParam(required = false) String type
    ) {
        log.info("Nearby search: lat={}, lon={}, radius={}, type={}", lat, lon, radius, type);
        
        try {
            NearbySearchResponse response = mapService.searchNearby(lat, lon, radius, type);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Nearby search failed", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.success("Nearby search failed: " + e.getMessage(), null));
        }
    }
}