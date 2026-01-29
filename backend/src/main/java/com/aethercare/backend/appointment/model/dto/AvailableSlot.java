package com.aethercare.backend.appointment.model.dto;

import java.time.Instant;

public record AvailableSlot(
    Instant startTime,
    Instant endTime,
    boolean isAvailable
) {}