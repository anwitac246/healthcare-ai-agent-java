package com.aethercare.backend.auth.service;

import com.aethercare.backend.auth.model.AuthResponse;
import com.aethercare.backend.auth.model.LoginRequest;
import com.aethercare.backend.auth.model.RegisterRequest;
import com.aethercare.backend.common.exception.UnauthorizedException;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.model.UserRole;
import com.aethercare.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    
    private final UserRepository userRepository;
    
    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByFirebaseUid(request.firebaseUid())) {
            throw new IllegalStateException("User already registered");
        }
        
        User user = new User();
        user.setFirebaseUid(request.firebaseUid());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setRole(request.role());
        user.setPhoneNumber(request.phoneNumber());
        
        if (request.role() == UserRole.DOCTOR) {
            user.setMedicalLicenseNumber(request.medicalLicenseNumber());
            user.setSpecialization(request.specialization());
            user.setClinicLocation(request.clinicLocation());
            user.setYearsOfExperience(request.yearsOfExperience());
        } else if (request.role() == UserRole.PATIENT) {
            user.setDateOfBirth(request.dateOfBirth());
            user.setGender(request.gender());
        }
        
        user = userRepository.save(user);
        
        logger.info("New {} registered: {}", request.role(), request.email());
        
        return new AuthResponse(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getRole(),
            "Registration successful"
        );
    }
    
    public AuthResponse login(LoginRequest request, UserRole expectedRole) {
        User user = userRepository.findByFirebaseUid(request.firebaseUid())
            .orElseThrow(() -> new UnauthorizedException("User not found. Please register first."));
        
        if (user.getRole() != expectedRole) {
            throw new UnauthorizedException(
                String.format("Access denied. Please use the %s login.", user.getRole().name().toLowerCase())
            );
        }
        
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        
        logger.info("{} logged in: {}", user.getRole(), user.getEmail());
        
        return new AuthResponse(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getRole(),
            "Login successful"
        );
    }
    
    public void verifyPasswordResetEligibility(String email, UserRole role) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UnauthorizedException("No account found with this email address."));
        
        if (user.getRole() != role) {
            throw new UnauthorizedException(
                String.format("This email is registered as a %s. Please use the %s password reset.", 
                    user.getRole().name().toLowerCase(), 
                    user.getRole().name().toLowerCase())
            );
        }
        
        logger.info("Password reset verification successful for {} {}", role, email);
    }
}