package com.aethercare.backend.map_service.models.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Location {
    private Double latitude;
    private Double longitude;
    private String displayName;
}