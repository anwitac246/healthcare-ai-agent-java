package com.aethercare.backend.appointment.model.dto;

import java.time.LocalDate;
import java.util.List;

public record DoctorAvailabilityResponse(
    String doctorId,
    String doctorName,
    String specialization,
    LocalDate date,
    List<AvailableSlot> availableSlots
) {}