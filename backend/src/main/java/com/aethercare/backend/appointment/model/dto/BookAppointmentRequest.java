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
    private Instant appointmentDateTime;
    
    @NotNull(message = "Appointment mode is required")
    private AppointmentMode mode;
    
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
    
    // Duration is fixed at 45 minutes in the service
    private Integer durationMinutes = 45;
}