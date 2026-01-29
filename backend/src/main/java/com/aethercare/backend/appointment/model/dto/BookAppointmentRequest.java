package com.aethercare.backend.appointment.model.dto;

import com.aethercare.backend.appointment.model.Appointment.AppointmentMode;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record BookAppointmentRequest(
    @NotBlank(message = "Doctor ID is required")
    String doctorId,
    
    @NotNull(message = "Appointment date and time is required")
    @Future(message = "Appointment must be in the future")
    Instant appointmentDateTime,
    
    @NotNull(message = "Appointment mode is required")
    AppointmentMode mode,
    
    String notes
) {}