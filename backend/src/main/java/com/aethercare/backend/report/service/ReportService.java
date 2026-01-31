package com.aethercare.backend.report.service;

import com.aethercare.backend.report.model.MedicalReport;
import com.aethercare.backend.report.repository.MedicalReportRepository;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {
    
    private final MedicalReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PdfGenerationService pdfGenerationService;
    
    public MedicalReport createReport(
            String userId,
            String conversationId,
            String diagnosis,
            List<String> symptoms,
            List<String> medications,
            List<String> careInstructions,
            Double confidence
    ) {
        log.info("Creating medical report for user: {}", userId);
        
        try {
            User user = userRepository.findByFirebaseUid(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            MedicalReport report = MedicalReport.builder()
                .userId(userId)
                .conversationId(conversationId)
                .patientName(user.getFirstName() + " " + user.getLastName())
                .patientEmail(user.getEmail())
                .patientPhone(user.getPhoneNumber())
                .patientDob(user.getDateOfBirth())
                .patientGender(user.getGender())
                .diagnosis(diagnosis)
                .symptoms(symptoms)
                .medications(medications)
                .careInstructions(careInstructions)
                .confidence(confidence)
                .generatedAt(Instant.now())
                .createdAt(Instant.now())
                .build();
            
            report = reportRepository.save(report);
            
            String pdfPath = pdfGenerationService.generatePrescriptionPdf(report);
            report.setPdfPath(pdfPath);
            report = reportRepository.save(report);
            
            log.info("Medical report created successfully: {}", report.getId());
            return report;
            
        } catch (Exception e) {
            log.error("Failed to create medical report", e);
            throw new RuntimeException("Failed to create medical report: " + e.getMessage());
        }
    }
    
    public List<MedicalReport> getPatientReports(String userId, int limit) {
        return reportRepository.findByUserIdOrderByGeneratedAtDesc(
            userId,
            PageRequest.of(0, limit)
        );
    }
    
    public MedicalReport getReport(String reportId) {
        return reportRepository.findById(reportId)
            .orElseThrow(() -> new RuntimeException("Report not found"));
    }
}