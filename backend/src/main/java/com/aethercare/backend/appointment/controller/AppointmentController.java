package com.aethercare.backend.appointment.controller;

import com.aethercare.backend.appointment.model.dto.*;
import com.aethercare.backend.appointment.service.AppointmentService;
import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {
    
    private final AppointmentService appointmentService;
    
    /**
     * Book a new appointment (Patient only)
     */
    @PostMapping("/book")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
        @Valid @RequestBody BookAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Booking appointment for patient: {}", userDetails.getEmail());
        
        try {
            AppointmentResponse response = appointmentService.bookAppointment(
                userDetails.getFirebaseUid(),
                request
            );
            return ResponseEntity.ok(ApiResponse.success("Appointment booked successfully", response));
        } catch (Exception e) {
            log.error("Appointment booking failed", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Get doctor's availability for a specific date
     */
    @GetMapping("/availability/{doctorId}")
    public ResponseEntity<ApiResponse<DoctorAvailabilityResponse>> getDoctorAvailability(
        @PathVariable String doctorId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        log.info("Fetching availability for doctor: {} on date: {}", doctorId, date);
        
        try {
            DoctorAvailabilityResponse response = appointmentService.getDoctorAvailability(
                doctorId,
                date
            );
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Failed to fetch availability", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Get all appointments for the authenticated patient
     */
    @GetMapping("/patient/my-appointments")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getPatientAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Fetching appointments for patient: {}", userDetails.getEmail());
        
        try {
            List<AppointmentResponse> appointments = appointmentService.getPatientAppointments(
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch patient appointments", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Get all appointments for the authenticated doctor
     */
    @GetMapping("/doctor/my-appointments")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Fetching appointments for doctor: {}", userDetails.getEmail());
        
        try {
            List<AppointmentResponse> appointments = appointmentService.getDoctorAppointments(
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch doctor appointments", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Get specific appointment details with video link if available
     */
    @GetMapping("/{appointmentId}")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getAppointment(
        @PathVariable String appointmentId,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Fetching appointment: {} for user: {}", appointmentId, userDetails.getEmail());
        
        try {
            AppointmentResponse response = appointmentService.getAppointmentById(
                appointmentId,
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Failed to fetch appointment", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Approve an appointment (Doctor only)
     */
    @PostMapping("/{appointmentId}/approve")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> approveAppointment(
        @PathVariable String appointmentId,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Doctor {} approving appointment {}", userDetails.getEmail(), appointmentId);
        
        try {
            AppointmentResponse response = appointmentService.approveAppointment(
                appointmentId,
                userDetails.getFirebaseUid()
            );
            return ResponseEntity.ok(ApiResponse.success("Appointment approved successfully", response));
        } catch (Exception e) {
            log.error("Failed to approve appointment", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Reject an appointment (Doctor only)
     */
    @PostMapping("/{appointmentId}/reject")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rejectAppointment(
        @PathVariable String appointmentId,
        @Valid @RequestBody RejectAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Doctor {} rejecting appointment {}", userDetails.getEmail(), appointmentId);
        
        try {
            AppointmentResponse response = appointmentService.rejectAppointment(
                appointmentId,
                userDetails.getFirebaseUid(),
                request
            );
            return ResponseEntity.ok(ApiResponse.success("Appointment rejected", response));
        } catch (Exception e) {
            log.error("Failed to reject appointment", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Cancel an appointment
     */
    @PostMapping("/{appointmentId}/cancel")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
        @PathVariable String appointmentId,
        @Valid @RequestBody CancelAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Cancelling appointment: {} by user: {}", appointmentId, userDetails.getEmail());
        
        try {
            AppointmentResponse response = appointmentService.cancelAppointment(
                appointmentId,
                userDetails.getFirebaseUid(),
                request
            );
            return ResponseEntity.ok(ApiResponse.success("Appointment cancelled successfully", response));
        } catch (Exception e) {
            log.error("Failed to cancel appointment", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), null)
            );
        }
    }
    
    /**
     * Validate video conference link
     */
    @GetMapping("/{appointmentId}/validate-video-link")
    public ResponseEntity<ApiResponse<Boolean>> validateVideoLink(
        @PathVariable String appointmentId
    ) {
        log.info("Validating video link for appointment: {}", appointmentId);
        
        try {
            boolean isValid = appointmentService.validateVideoLinkAccess(appointmentId);
            return ResponseEntity.ok(ApiResponse.success(isValid));
        } catch (Exception e) {
            log.error("Failed to validate video link", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.success(e.getMessage(), false)
            );
        }
    }
}