package com.aethercare.backend.auth.model;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String firebaseUid
) {}