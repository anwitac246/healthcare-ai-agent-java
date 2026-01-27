package com.aethercare.backend.diagnosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "diagnoses")
public class Diagnosis {
    
    @Id
    private String id;
    
    private String userId;
    private String query;
    private DiagnosisStatus status;
    private String result;
    private Instant createdAt;
    private Instant updatedAt;
    
    public enum DiagnosisStatus {
        COMPLETED,
        FAILED,
        PROCESSING
    }
    
    public Diagnosis() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.status = DiagnosisStatus.PROCESSING;
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    
    public DiagnosisStatus getStatus() { return status; }
    public void setStatus(DiagnosisStatus status) { this.status = status; }
    
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}