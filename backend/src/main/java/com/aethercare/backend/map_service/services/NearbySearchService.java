package com.aethercare.backend.map_service.services;

import com.aethercare.backend.map_service.models.dto.Location;
import com.aethercare.backend.map_service.models.dto.NearbySearchResponse;
import com.aethercare.backend.map_service.models.dto.Place;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NearbySearchService {
    
    private final WebClient overpassClient;
    
    public NearbySearchResponse searchNearby(Double lat, Double lon, Integer radius, String type) {
        try {
            String query = buildOverpassQuery(lat, lon, radius, type);
            
            Map<String, Object> response = overpassClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/interpreter")
                            .queryParam("data", query)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            
            if (response == null) {
                return NearbySearchResponse.builder()
                        .success(false)
                        .message("No response from search service")
                        .places(Collections.emptyList())
                        .build();
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> elements = (List<Map<String, Object>>) response.get("elements");
            
            if (elements == null || elements.isEmpty()) {
                return NearbySearchResponse.builder()
                        .success(true)
                        .message("No results found")
                        .places(Collections.emptyList())
                        .build();
            }
            
            List<Place> places = elements.stream()
                    .map(element -> parsePlace(element, lat, lon))
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparingDouble(Place::getDistance))
                    .collect(Collectors.toList());
            
            return NearbySearchResponse.builder()
                    .success(true)
                    .message("Search successful")
                    .places(places)
                    .totalResults(places.size())
                    .build();
                    
        } catch (Exception e) {
            log.error("Nearby search failed", e);
            throw new RuntimeException("Nearby search failed: " + e.getMessage());
        }
    }
    
    private String buildOverpassQuery(Double lat, Double lon, Integer radius, String type) {
        String tags = getTagsForType(type);
        
        return String.format(
                "[out:json][timeout:25];(node[%s](around:%d,%f,%f);way[%s](around:%d,%f,%f););out center;",
                tags, radius, lat, lon, tags, radius, lat, lon
        );
    }
    
    private String getTagsForType(String type) {
        if (type == null || type.isEmpty()) {
            return "amenity~\"hospital|clinic|doctors\"";
        }
        
        return switch (type.toLowerCase()) {
            case "hospital" -> "amenity=hospital";
            case "clinic" -> "amenity=clinic";
            case "doctor", "doctors" -> "amenity=doctors";
            case "pharmacy" -> "amenity=pharmacy";
            case "ambulance" -> "emergency=ambulance_station";
            default -> "amenity~\"hospital|clinic|doctors\"";
        };
    }
    
    private Place parsePlace(Map<String, Object> element, Double userLat, Double userLon) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tags = (Map<String, Object>) element.get("tags");
            
            if (tags == null) {
                return null;
            }
            
            Double placeLat = getLatitude(element);
            Double placeLon = getLongitude(element);
            
            if (placeLat == null || placeLon == null) {
                return null;
            }
            
            String name = tags.getOrDefault("name", "Unnamed").toString();
            String amenity = tags.getOrDefault("amenity", "unknown").toString();
            String address = buildAddress(tags);
            String phone = tags.getOrDefault("phone", null) != null ? tags.get("phone").toString() : null;
            String website = tags.getOrDefault("website", null) != null ? tags.get("website").toString() : null;
            
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
            log.warn("Failed to parse place element", e);
            return null;
        }
    }
    
    private Double getLatitude(Map<String, Object> element) {
        if (element.containsKey("lat")) {
            return ((Number) element.get("lat")).doubleValue();
        }
        
        @SuppressWarnings("unchecked")
        Map<String, Object> center = (Map<String, Object>) element.get("center");
        if (center != null && center.containsKey("lat")) {
            return ((Number) center.get("lat")).doubleValue();
        }
        
        return null;
    }
    
    private Double getLongitude(Map<String, Object> element) {
        if (element.containsKey("lon")) {
            return ((Number) element.get("lon")).doubleValue();
        }
        
        @SuppressWarnings("unchecked")
        Map<String, Object> center = (Map<String, Object>) element.get("center");
        if (center != null && center.containsKey("lon")) {
            return ((Number) center.get("lon")).doubleValue();
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
        if (tags.containsKey("addr:city")) {
            parts.add(tags.get("addr:city").toString());
        }
        
        return parts.isEmpty() ? "Address not available" : String.join(", ", parts);
    }
    
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c * 1000;
    }
}