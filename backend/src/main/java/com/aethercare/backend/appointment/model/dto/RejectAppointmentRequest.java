package com.aethercare.backend.appointment.model.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectAppointmentRequest(
    @NotBlank(message = "Rejection reason is required")
    String reason
) {}