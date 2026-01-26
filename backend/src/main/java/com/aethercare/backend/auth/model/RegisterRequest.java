package com.aethercare.backend.auth.model;

import com.aethercare.backend.user.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterRequest(
    @NotBlank String firebaseUid,
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank @Email String email,
    @NotNull UserRole role,
    String phoneNumber,
    String dateOfBirth,
    String gender,
    // Doctor-specific
    String medicalLicenseNumber,
    String specialization,
    String clinicLocation,
    Integer yearsOfExperience
) {}