package com.aethercare.backend.user.model.dto;

public record DoctorListDTO(
    String id,
    String name,
    String specialization,
    String clinicLocation,
    Integer yearsOfExperience
) {}