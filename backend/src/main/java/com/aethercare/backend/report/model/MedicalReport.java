package com.aethercare.backend.report.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "medical_reports")
public class MedicalReport {
    
    @Id
    private String id;
    
    @Indexed
    private String userId;
    
    @Indexed
    private String conversationId;
    
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private String patientDob;
    private String patientGender;
    
    private String diagnosis;
    private List<String> symptoms;
    private List<String> medications;
    private List<String> careInstructions;
    
    private Double confidence;
    
    private String pdfPath;
    
    @Indexed
    private Instant generatedAt;
    
    private Instant createdAt;
}