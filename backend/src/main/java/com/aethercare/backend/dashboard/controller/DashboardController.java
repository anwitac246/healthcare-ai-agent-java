package com.aethercare.backend.dashboard.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.dashboard.model.DoctorDashboardResponse;
import com.aethercare.backend.dashboard.model.PatientDashboardResponse;
import com.aethercare.backend.dashboard.service.DashboardService;
import com.aethercare.backend.user.model.UserRole;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }
    
    @GetMapping("/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<PatientDashboardResponse>> getPatientDashboard(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        PatientDashboardResponse response = dashboardService.getPatientDashboard(
            userDetails.getFirebaseUid()
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorDashboardResponse>> getDoctorDashboard(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        DoctorDashboardResponse response = dashboardService.getDoctorDashboard(
            userDetails.getFirebaseUid()
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // Generic endpoint that routes based on role
    @GetMapping
    public ResponseEntity<?> getDashboard(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        if (userDetails.getRole() == UserRole.PATIENT) {
            PatientDashboardResponse response = dashboardService.getPatientDashboard(
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success(response));
        } else if (userDetails.getRole() == UserRole.DOCTOR) {
            DoctorDashboardResponse response = dashboardService.getDoctorDashboard(
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success(response));
        }
        
        return ResponseEntity.badRequest().build();
    }
}