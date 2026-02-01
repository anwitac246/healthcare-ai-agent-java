package com.aethercare.backend.map_service.services;

import com.aethercare.backend.map_service.models.dto.Location;
import com.aethercare.backend.map_service.models.dto.NearbySearchResponse;
import com.aethercare.backend.map_service.models.dto.Place;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NearbySearchService {
    
    private final WebClient overpassClient;
    
    public NearbySearchResponse searchNearby(Double lat, Double lon, Integer radius, String type) {
        log.info("Searching nearby: lat={}, lon={}, radius={}, type={}", lat, lon, radius, type);
        
        try {
            String query = buildOverpassQuery(lat, lon, radius, type);
            log.debug("Overpass query: {}", query);
            
            Map<String, Object> response = overpassClient.post()
                    .uri("/api/interpreter")
                    .bodyValue(query)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .onErrorResume(e -> {
                        log.error("Overpass API error: {}", e.getMessage());
                        return Mono.just(Collections.emptyMap());
                    })
                    .block();
            
            if (response == null || response.isEmpty()) {
                log.warn("Empty response from Overpass API");
                return NearbySearchResponse.builder()
                        .success(false)
                        .message("No response from search service")
                        .places(Collections.emptyList())
                        .totalResults(0)
                        .build();
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> elements = (List<Map<String, Object>>) response.get("elements");
            
            if (elements == null || elements.isEmpty()) {
                log.info("No healthcare facilities found in area");
                return NearbySearchResponse.builder()
                        .success(true)
                        .message("No healthcare facilities found in this area")
                        .places(Collections.emptyList())
                        .totalResults(0)
                        .build();
            }
            
            log.info("Found {} elements from Overpass", elements.size());
            
            List<Place> places = elements.stream()
                    .map(element -> parsePlace(element, lat, lon))
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparingDouble(Place::getDistance))
                    .limit(50) // Limit results
                    .collect(Collectors.toList());
            
            log.info("Parsed {} valid places", places.size());
            
            return NearbySearchResponse.builder()
                    .success(true)
                    .message("Search successful")
                    .places(places)
                    .totalResults(places.size())
                    .build();
                    
        } catch (Exception e) {
            log.error("Nearby search failed", e);
            return NearbySearchResponse.builder()
                    .success(false)
                    .message("Search failed: " + e.getMessage())
                    .places(Collections.emptyList())
                    .totalResults(0)
                    .build();
        }
    }
    
    private String buildOverpassQuery(Double lat, Double lon, Integer radius, String type) {
        String tags = getTagsForType(type);
        
        // Fixed Overpass QL format
        return String.format(
                "[out:json][timeout:25];" +
                "(" +
                "  node[%s](around:%d,%.6f,%.6f);" +
                "  way[%s](around:%d,%.6f,%.6f);" +
                ");" +
                "out body;" +
                ">;out skel qt;",
                tags, radius, lat, lon,
                tags, radius, lat, lon
        );
    }
    
    private String getTagsForType(String type) {
        if (type == null || type.isEmpty() || "all".equals(type.toLowerCase())) {
            return "amenity~\"^(hospital|clinic|doctors|pharmacy)$\"";
        }
        
        return switch (type.toLowerCase()) {
            case "hospital" -> "amenity=hospital";
            case "clinic" -> "amenity=clinic";
            case "doctor", "doctors" -> "amenity=doctors";
            case "pharmacy" -> "amenity=pharmacy";
            case "ambulance" -> "emergency=ambulance_station";
            default -> "amenity~\"^(hospital|clinic|doctors)$\"";
        };
    }
    
    private Place parsePlace(Map<String, Object> element, Double userLat, Double userLon) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tags = (Map<String, Object>) element.get("tags");
            
            if (tags == null || tags.isEmpty()) {
                log.debug("Skipping element with no tags");
                return null;
            }
            
            Double placeLat = getLatitude(element);
            Double placeLon = getLongitude(element);
            
            if (placeLat == null || placeLon == null) {
                log.debug("Skipping element with no coordinates");
                return null;
            }
            
            String name = tags.getOrDefault("name", "Unnamed Facility").toString();
            String amenity = tags.getOrDefault("amenity", 
                             tags.getOrDefault("emergency", "healthcare")).toString();
            String address = buildAddress(tags);
            String phone = tags.get("phone") != null ? tags.get("phone").toString() : null;
            String website = tags.get("website") != null ? tags.get("website").toString() : null;
            
            double distance = calculateDistance(userLat, userLon, placeLat, placeLon);
            
            Location location = Location.builder()
                    .latitude(placeLat)
                    .longitude(placeLon)
                    .displayName(address)
                    .build();
            
            return Place.builder()
                    .name(name)
                    .type(amenity)
                    .location(location)
                    .distance(distance)
                    .address(address)
                    .phone(phone)
                    .website(website)
                    .build();
                    
        } catch (Exception e) {
            log.warn("Failed to parse place element: {}", e.getMessage());
            return null;
        }
    }
    
    private Double getLatitude(Map<String, Object> element) {
        // Direct lat property
        if (element.containsKey("lat")) {
            Object latObj = element.get("lat");
            if (latObj instanceof Number) {
                return ((Number) latObj).doubleValue();
            }
        }
        
        // Center property (for ways/relations)
        @SuppressWarnings("unchecked")
        Map<String, Object> center = (Map<String, Object>) element.get("center");
        if (center != null && center.containsKey("lat")) {
            Object latObj = center.get("lat");
            if (latObj instanceof Number) {
                return ((Number) latObj).doubleValue();
            }
        }
        
        return null;
    }
    
    private Double getLongitude(Map<String, Object> element) {
        // Direct lon property
        if (element.containsKey("lon")) {
            Object lonObj = element.get("lon");
            if (lonObj instanceof Number) {
                return ((Number) lonObj).doubleValue();
            }
        }
        
        // Center property (for ways/relations)
        @SuppressWarnings("unchecked")
        Map<String, Object> center = (Map<String, Object>) element.get("center");
        if (center != null && center.containsKey("lon")) {
            Object lonObj = center.get("lon");
            if (lonObj instanceof Number) {
                return ((Number) lonObj).doubleValue();
            }
        }
        
        return null;
    }
    
    private String buildAddress(Map<String, Object> tags) {
        List<String> parts = new ArrayList<>();
        
        if (tags.containsKey("addr:housenumber")) {
            parts.add(tags.get("addr:housenumber").toString());
        }
        if (tags.containsKey("addr:street")) {
            parts.add(tags.get("addr:street").toString());
        }
        if (tags.containsKey("addr:suburb") || tags.containsKey("addr:neighbourhood")) {
            String area = tags.containsKey("addr:suburb") ? 
                         tags.get("addr:suburb").toString() : 
                         tags.get("addr:neighbourhood").toString();
            parts.add(area);
        }
        if (tags.containsKey("addr:city")) {
            parts.add(tags.get("addr:city").toString());
        }
        if (tags.containsKey("addr:state")) {
            parts.add(tags.get("addr:state").toString());
        }
        
        return parts.isEmpty() ? "Address not available" : String.join(", ", parts);
    }
    
    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in meters
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS_KM = 6371;
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        double distanceKm = EARTH_RADIUS_KM * c;
        
        return distanceKm * 1000; // Convert to meters
    }
}