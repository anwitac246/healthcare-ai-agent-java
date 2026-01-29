package com.aethercare.backend.appointment.model.dto;

import com.aethercare.backend.appointment.model.Appointment.*;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AppointmentResponse {
    private String id;
    private String patientId;
    private String doctorId;
    private String patientName;
    private String patientEmail;
    private String doctorName;
    private String doctorSpecialization;
    private Instant appointmentDateTime;
    private Integer durationMinutes;
    private AppointmentStatus status;
    private AppointmentMode mode;
    private String notes;
    private String videoConferenceLink;
    private boolean videoLinkAvailable;
    private Instant holdExpiresAt;
    private Instant createdAt;
    private String cancellationReason;
    private String rejectionReason;
}