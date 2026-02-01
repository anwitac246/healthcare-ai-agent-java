package com.aethercare.backend.map_service.models.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Place {
    private String name;
    private String type;
    private Location location;
    private Double distance;
    private String address;
    private String phone;
    private String website;
}