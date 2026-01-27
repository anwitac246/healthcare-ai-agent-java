package com.aethercare.backend.dashboard.model;


public record UserOverviewDTO(
    String name,
    String email,
    String accountCreatedAt
) {}