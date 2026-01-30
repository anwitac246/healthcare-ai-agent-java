package com.aethercare.backend.appointment.controller;

import com.aethercare.backend.appointment.model.dto.*;
import com.aethercare.backend.appointment.service.AppointmentService;
import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
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
    
    @PostMapping("/book")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
        @Valid @RequestBody BookAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        try {
            log.info("Patient {} booking appointment with doctor {}", 
                     userDetails.getFirebaseUid(), request.getDoctorId());
            
            AppointmentResponse response = appointmentService.bookAppointment(
                request,
                userDetails.getFirebaseUid()
            );
            
            return ResponseEntity.ok(ApiResponse.success("Appointment booked successfully. Awaiting doctor approval.", response));
        } catch (IllegalArgumentException e) {
            log.error("Booking validation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.success(e.getMessage(), null));
        } catch (IllegalStateException e) {
            log.error("Booking failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.success(e.getMessage(), null));
        } catch (Exception e) {
            log.error("Booking failed with unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to book appointment: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/{appointmentId}/approve")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> approveAppointment(
        @PathVariable String appointmentId,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        try {
            log.info("Doctor {} approving appointment {}", userDetails.getFirebaseUid(), appointmentId);
            
            AppointmentResponse response = appointmentService.approveAppointment(
                appointmentId,
                userDetails.getFirebaseUid()
            );
            
            return ResponseEntity.ok(ApiResponse.success("Appointment approved successfully", response));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("Approval failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.success(e.getMessage(), null));
        } catch (Exception e) {
            log.error("Approval failed with unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to approve appointment: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/{appointmentId}/reject")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rejectAppointment(
        @PathVariable String appointmentId,
        @RequestBody @Valid RejectAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        try {
            log.info("Doctor {} rejecting appointment {}", userDetails.getFirebaseUid(), appointmentId);
            
            AppointmentResponse response = appointmentService.rejectAppointment(
                appointmentId,
                userDetails.getFirebaseUid(),
                request.getReason()
            );
            
            return ResponseEntity.ok(ApiResponse.success("Appointment rejected", response));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("Rejection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.success(e.getMessage(), null));
        } catch (Exception e) {
            log.error("Rejection failed with unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to reject appointment: " + e.getMessage(), null));
        }
    }
    
    @PostMapping("/{appointmentId}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
        @PathVariable String appointmentId,
        @RequestBody @Valid CancelAppointmentRequest request,
        @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        try {
            log.info("Patient {} cancelling appointment {}", userDetails.getFirebaseUid(), appointmentId);
            
            AppointmentResponse response = appointmentService.cancelAppointment(
                appointmentId,
                userDetails.getFirebaseUid(),
                request.getReason()
            );
            
            return ResponseEntity.ok(ApiResponse.success("Appointment cancelled", response));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("Cancellation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.success(e.getMessage(), null));
        } catch (Exception e) {
            log.error("Cancellation failed with unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to cancel appointment: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/patient/upcoming")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getPatientUpcomingAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails,
        @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            List<AppointmentResponse> appointments = appointmentService.getPatientUpcomingAppointments(
                userDetails.getFirebaseUid(),
                limit
            );
            
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch upcoming appointments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to fetch appointments: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/patient/past")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getPatientPastAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails,
        @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            List<AppointmentResponse> appointments = appointmentService.getPatientPastAppointments(
                userDetails.getFirebaseUid(),
                limit
            );
            
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch past appointments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to fetch appointments: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/doctor/upcoming")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorUpcomingAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails,
        @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            List<AppointmentResponse> appointments = appointmentService.getDoctorUpcomingAppointments(
                userDetails.getFirebaseUid(),
                limit
            );
            
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch upcoming appointments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to fetch appointments: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/doctor/past")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorPastAppointments(
        @AuthenticationPrincipal FirebaseUserDetails userDetails,
        @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            List<AppointmentResponse> appointments = appointmentService.getDoctorPastAppointments(
                userDetails.getFirebaseUid(),
                limit
            );
            
            return ResponseEntity.ok(ApiResponse.success(appointments));
        } catch (Exception e) {
            log.error("Failed to fetch past appointments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to fetch appointments: " + e.getMessage(), null));
        }
    }
    
    @GetMapping("/slots/{doctorId}")
    public ResponseEntity<ApiResponse<List<TimeSlotDTO>>> getAvailableSlots(
        @PathVariable String doctorId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        try {
            log.info("Fetching available slots for doctor {} on {}", doctorId, date);
            
            List<TimeSlotDTO> slots = appointmentService.getAvailableSlots(doctorId, date);
            
            return ResponseEntity.ok(ApiResponse.success(slots));
        } catch (Exception e) {
            log.error("Failed to fetch available slots", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.success("Failed to fetch available slots: " + e.getMessage(), null));
        }
    }
}