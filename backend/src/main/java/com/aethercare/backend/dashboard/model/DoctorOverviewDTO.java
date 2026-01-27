package com.aethercare.backend.dashboard.model;

public record DoctorOverviewDTO(
    String name,
    String email,
    String specialization,
    String clinicLocation,
    Integer yearsOfExperience,
    String accountCreatedAt
) {}