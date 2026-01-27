package com.aethercare.backend.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "appointments")
public class Appointment {
    
    @Id
    private String id;
    
    private String patientId;
    private String doctorId;
    private String doctorName;
    private String patientName;
    private String specialty;
    private AppointmentMode mode;
    private Instant appointmentDateTime;
    private AppointmentStatus status;
    private Instant createdAt;
    
    public enum AppointmentMode {
        ONLINE,
        IN_PERSON
    }
    
    public enum AppointmentStatus {
        SCHEDULED,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }
    
    public Appointment() {
        this.createdAt = Instant.now();
        this.status = AppointmentStatus.SCHEDULED;
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
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}