package com.aethercare.backend.appointment.model.dto;

import com.aethercare.backend.appointment.model.Appointment.AppointmentMode;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Instant;

@Data
public class BookAppointmentRequest {
    
    @NotBlank(message = "Doctor ID is required")
    private String doctorId;
    
    @NotNull(message = "Appointment date/time is required")
    @Future(message = "Appointment must be in the future")
    private Instant appointmentDateTime;
    
    @NotNull(message = "Appointment mode is required")
    private AppointmentMode mode;
    
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
    
    @Min(value = 30, message = "Duration must be at least 30 minutes")
    @Max(value = 120, message = "Duration cannot exceed 120 minutes")
    private Integer durationMinutes = 45; // Default 45 minutes
}