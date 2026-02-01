package com.aethercare.backend.map_service.models.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class NearbySearchResponse {
    private boolean success;
    private String message;
    private List<Place> places;
    private Integer totalResults;
}