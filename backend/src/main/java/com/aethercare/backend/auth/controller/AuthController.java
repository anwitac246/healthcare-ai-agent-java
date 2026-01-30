package com.aethercare.backend.auth.controller;

import com.aethercare.backend.auth.model.AuthResponse;
import com.aethercare.backend.auth.model.LoginRequest;
import com.aethercare.backend.auth.model.PasswordResetRequest;
import com.aethercare.backend.auth.model.RegisterRequest;
import com.aethercare.backend.auth.service.AuthService;
import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.user.model.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final AuthService authService;
    
    public AuthController(AuthService authService) {
        this.authService = authService;
    }
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PostMapping("/patient/login")
    public ResponseEntity<ApiResponse<AuthResponse>> patientLogin(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request, UserRole.PATIENT);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PostMapping("/doctor/login")
    public ResponseEntity<ApiResponse<AuthResponse>> doctorLogin(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request, UserRole.DOCTOR);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PostMapping("/password-reset/verify")
    public ResponseEntity<ApiResponse<String>> verifyPasswordResetEligibility(
            @Valid @RequestBody PasswordResetRequest request
    ) {
        authService.verifyPasswordResetEligibility(request.email(), request.role());
        return ResponseEntity.ok(ApiResponse.success("User verified. You may proceed with password reset."));
    }
}