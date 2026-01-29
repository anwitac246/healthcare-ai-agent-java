package com.aethercare.backend.appointment.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class TimeSlotDTO {
    private Instant startTime;
    private Instant endTime;
    private boolean isAvailable;
}