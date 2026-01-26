package com.aethercare.backend.auth.model;

import com.aethercare.backend.user.model.UserRole;

public record AuthResponse(
    String userId,
    String email,
    String firstName,
    String lastName,
    UserRole role,
    String message
) {}