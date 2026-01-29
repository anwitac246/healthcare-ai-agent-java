package com.aethercare.backend.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "appointments")
@CompoundIndex(name = "doctor_slot_idx", def = "{'doctorId': 1, 'appointmentDateTime': 1}", unique = true)
public class Appointment {
    
    @Id
    private String id;
    
    @Indexed
    private String patientId;
    
    @Indexed
    private String doctorId;
    
    private String patientName;
    private String patientEmail;
    private String doctorName;
    private String doctorSpecialization;
    
    @Indexed
    private Instant appointmentDateTime;
    
    private Integer durationMinutes; // Default 45
    
    @Indexed
    private AppointmentStatus status;
    
    private AppointmentMode mode;
    
    private String notes;
    private String patientCancellationReason;
    private String doctorRejectionReason;
    
    // Video conference details
    private String jitsiRoomName;
    private String videoConferenceLink;
    private Instant videoLinkValidFrom;
    private Instant videoLinkValidUntil;
    
    // Booking hold mechanism
    private Instant holdExpiresAt; // 30 minutes hold for doctor approval
    
    @Indexed
    private Instant createdAt;
    private Instant updatedAt;
    
    // Audit fields
    private String createdBy;
    private String lastModifiedBy;
    
    public enum AppointmentStatus {
        PENDING,      // Awaiting doctor approval
        SCHEDULED,    // Confirmed by doctor
        COMPLETED,    // Meeting finished
        CANCELLED,    // Cancelled by patient
        REJECTED,     // Rejected by doctor
        EXPIRED       // Hold expired without approval
    }
    
    public enum AppointmentMode {
        ONLINE,
        IN_PERSON
    }
    
    public boolean isVideoLinkValid() {
        if (videoLinkValidFrom == null || videoLinkValidUntil == null) {
            return false;
        }
        Instant now = Instant.now();
        return now.isAfter(videoLinkValidFrom) && now.isBefore(videoLinkValidUntil);
    }
    
    public boolean isInHoldPeriod() {
        if (holdExpiresAt == null) {
            return false;
        }
        return Instant.now().isBefore(holdExpiresAt);
    }
}