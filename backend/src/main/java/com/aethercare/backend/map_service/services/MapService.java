package com.aethercare.backend.map_service.services;

import com.aethercare.backend.map_service.models.dto.GeocodeResponse;
import com.aethercare.backend.map_service.models.dto.NearbySearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MapService {
    
    private final GeocodingService geocodingService;
    private final NearbySearchService nearbySearchService;
    
    public GeocodeResponse geocode(String query) {
        return geocodingService.geocode(query);
    }
    
    public NearbySearchResponse searchNearby(Double lat, Double lon, Integer radius, String type) {
        return nearbySearchService.searchNearby(lat, lon, radius, type);
    }
}