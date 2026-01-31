package com.aethercare.backend.report.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.report.model.MedicalReport;
import com.aethercare.backend.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    
    private final ReportService reportService;
    
    @GetMapping("/patient")
    public ResponseEntity<ApiResponse<List<MedicalReport>>> getPatientReports(
            @AuthenticationPrincipal FirebaseUserDetails userDetails,
            @RequestParam(defaultValue = "50") int limit
    ) {
        log.info("Fetching reports for patient: {}", userDetails.getFirebaseUid());
        
        try {
            List<MedicalReport> reports = reportService.getPatientReports(
                userDetails.getFirebaseUid(),
                limit
            );
            
            return ResponseEntity.ok(ApiResponse.success(reports));
        } catch (Exception e) {
            log.error("Failed to fetch reports", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.success("Failed to fetch reports: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/{reportId}/download")
    public ResponseEntity<Resource> downloadReport(
            @PathVariable String reportId,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Downloading report: {} for user: {}", reportId, userDetails.getFirebaseUid());
        
        try {
            MedicalReport report = reportService.getReport(reportId);
            
            if (!report.getUserId().equals(userDetails.getFirebaseUid())) {
                return ResponseEntity.status(403).build();
            }
            
            Path filePath = Paths.get(report.getPdfPath());
            Resource resource = new UrlResource(filePath.toUri());
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            
            String filename = "medical-report-" + reportId + ".pdf";
            
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
                
        } catch (Exception e) {
            log.error("Failed to download report", e);
            return ResponseEntity.status(500).build();
        }
    }
}