package com.aethercare.backend.dashboard.model;

public record AppointmentDTO(
    String id,
    String doctorName,
    AppointmentMode mode,
    String appointmentDateTime,
    String specialty
) {
    public enum AppointmentMode {
        ONLINE,
        IN_PERSON
    }
}