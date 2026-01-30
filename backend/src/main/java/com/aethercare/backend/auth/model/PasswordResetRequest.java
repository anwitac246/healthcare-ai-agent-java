package com.aethercare.backend.auth.model;

import com.aethercare.backend.user.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PasswordResetRequest(
    @NotBlank @Email String email,
    @NotNull UserRole role
) {}