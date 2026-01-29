package com.aethercare.backend.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "appointments")
public class Appointment {
    
    @Id
    private String id;
    
    @Indexed
    private String patientId;
    
    @Indexed
    private String doctorId;
    
    private String doctorName;
    private String patientName;
    private String patientEmail;
    private String doctorEmail;
    private String specialty;
    private AppointmentMode mode;
    
    @Indexed
    private Instant appointmentDateTime;
    
    private AppointmentStatus status;
    private String videoConferenceLink;
    private Instant videoLinkGeneratedAt;
    private Instant videoLinkExpiresAt;
    private String cancellationReason;
    private String cancelledBy;
    private Instant cancelledAt;
    private String rejectionReason;
    private Instant rejectedAt;
    private Instant approvedAt;
    private String notes;
    private Integer durationMinutes;
    
    @Indexed
    private Instant createdAt;
    
    private Instant updatedAt;
    
    public enum AppointmentMode {
        ONLINE,
        IN_PERSON
    }
    
    public enum AppointmentStatus {
        PENDING,        // Waiting for doctor approval
        SCHEDULED,      // Doctor approved
        REJECTED,       // Doctor rejected
        COMPLETED,
        CANCELLED,
        NO_SHOW,
        IN_PROGRESS
    }
    
    public Appointment() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.status = AppointmentStatus.PENDING;  // Appointments start as PENDING
        this.durationMinutes = 45;
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    
    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }
    
    public String getDoctorEmail() { return doctorEmail; }
    public void setDoctorEmail(String doctorEmail) { this.doctorEmail = doctorEmail; }
    
    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
    
    public AppointmentMode getMode() { return mode; }
    public void setMode(AppointmentMode mode) { this.mode = mode; }
    
    public Instant getAppointmentDateTime() { return appointmentDateTime; }
    public void setAppointmentDateTime(Instant appointmentDateTime) { 
        this.appointmentDateTime = appointmentDateTime; 
    }
    
    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }
    
    public String getVideoConferenceLink() { return videoConferenceLink; }
    public void setVideoConferenceLink(String videoConferenceLink) { 
        this.videoConferenceLink = videoConferenceLink; 
    }
    
    public Instant getVideoLinkGeneratedAt() { return videoLinkGeneratedAt; }
    public void setVideoLinkGeneratedAt(Instant videoLinkGeneratedAt) { 
        this.videoLinkGeneratedAt = videoLinkGeneratedAt; 
    }
    
    public Instant getVideoLinkExpiresAt() { return videoLinkExpiresAt; }
    public void setVideoLinkExpiresAt(Instant videoLinkExpiresAt) { 
        this.videoLinkExpiresAt = videoLinkExpiresAt; 
    }
    
    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { 
        this.cancellationReason = cancellationReason; 
    }
    
    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String cancelledBy) { this.cancelledBy = cancelledBy; }
    
    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
    
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { 
        this.rejectionReason = rejectionReason; 
    }
    
    public Instant getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(Instant rejectedAt) { this.rejectedAt = rejectedAt; }
    
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { 
        this.durationMinutes = durationMinutes; 
    }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}