package com.aethercare.backend.user.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.model.UserRole;
import com.aethercare.backend.user.model.dto.DoctorListDTO;
import com.aethercare.backend.user.model.dto.UpdateProfileRequest;
import com.aethercare.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    private final UserRepository userRepository;
    
    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<User>> getProfile(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        User user = userRepository.findByFirebaseUid(userDetails.getFirebaseUid())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<User>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        User user = userRepository.findByFirebaseUid(userDetails.getFirebaseUid())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setGender(request.getGender());
        user.setUpdatedAt(Instant.now());
        
        user = userRepository.save(user);
        
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<DoctorListDTO>>> getAllDoctors() {
        List<User> doctors = userRepository.findByRole(UserRole.DOCTOR);
        
        List<DoctorListDTO> doctorList = doctors.stream()
            .map(doctor -> new DoctorListDTO(
                doctor.getId(),
                "Dr. " + doctor.getFirstName() + " " + doctor.getLastName(),
                doctor.getSpecialization(),
                doctor.getClinicLocation(),
                doctor.getYearsOfExperience()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(doctorList));
    }
    
    @GetMapping("/doctor/dashboard")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<String>> doctorDashboard(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        return ResponseEntity.ok(
            ApiResponse.success("Welcome Dr. " + userDetails.getName())
        );
    }
    
    @GetMapping("/patient/dashboard")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<String>> patientDashboard(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        return ResponseEntity.ok(
            ApiResponse.success("Welcome " + userDetails.getName())
        );
    }
}