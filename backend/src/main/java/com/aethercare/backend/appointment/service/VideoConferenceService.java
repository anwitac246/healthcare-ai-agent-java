package com.aethercare.backend.appointment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
public class VideoConferenceService {
    
    private static final String JITSI_BASE_URL = "https://meet.jit.si";
    
    /**
     * Generates a unique Jitsi meeting room link
     * Format: https://meet.jit.si/AetherCare-{appointmentId}-{randomToken}
     */
    public String generateMeetingLink(String appointmentId) {
        String roomName = generateRoomName(appointmentId);
        String meetingUrl = String.format("%s/%s", JITSI_BASE_URL, roomName);
        
        log.info("Generated Jitsi meeting link for appointment {}: {}", appointmentId, meetingUrl);
        return meetingUrl;
    }
    
    /**
     * Validates if a video link is still active
     */
    public boolean isLinkValid(Instant expiresAt) {
        if (expiresAt == null) {
            return false;
        }
        return Instant.now().isBefore(expiresAt);
    }
    
    /**
     * Calculates link expiry time (45 minutes after generation)
     */
    public Instant calculateExpiryTime(Instant generatedAt) {
        return generatedAt.plusSeconds(45 * 60); // 45 minutes
    }
    
    /**
     * Generates a unique, secure room name for the meeting
     */
    private String generateRoomName(String appointmentId) {
        String randomToken = UUID.randomUUID().toString().substring(0, 8);
        return String.format("AetherCare-%s-%s", appointmentId, randomToken);
    }
    
    /**
     * Checks if it's time to generate the video link (5 minutes before appointment)
     */
    public boolean shouldGenerateLink(Instant appointmentTime) {
        Instant now = Instant.now();
        Instant linkGenerationTime = appointmentTime.minusSeconds(5 * 60); // 5 minutes before
        
        return now.isAfter(linkGenerationTime) || now.equals(linkGenerationTime);
    }
}