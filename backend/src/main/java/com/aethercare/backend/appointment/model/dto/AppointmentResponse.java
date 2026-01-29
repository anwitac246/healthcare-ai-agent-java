package com.aethercare.backend.appointment.model.dto;

import com.aethercare.backend.appointment.model.Appointment.AppointmentMode;
import com.aethercare.backend.appointment.model.Appointment.AppointmentStatus;

import java.time.Instant;

public record AppointmentResponse(
    String id,
    String doctorId,
    String doctorName,
    String doctorEmail,
    String patientId,
    String patientName,
    String patientEmail,
    String specialty,
    AppointmentMode mode,
    Instant appointmentDateTime,
    AppointmentStatus status,
    String videoConferenceLink,
    boolean videoLinkAvailable,
    Instant videoLinkExpiresAt,
    String cancellationReason,
    String cancelledBy,
    String rejectionReason,
    Instant rejectedAt,
    Instant approvedAt,
    String notes,
    Integer durationMinutes,
    Instant createdAt
) {}