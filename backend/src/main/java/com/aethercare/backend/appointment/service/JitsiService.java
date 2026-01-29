package com.aethercare.backend.appointment.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class JitsiService {
    
    private static final String JITSI_DOMAIN = "meet.jit.si";
    private static final SecureRandom random = new SecureRandom();
    
    /**
     * Generate a unique room name for Jitsi
     */
    public String generateRoomName() {
        byte[] randomBytes = new byte[16];
        random.nextBytes(randomBytes);
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        return "aethercare-" + encoded;
    }
    
    /**
     * Generate full Jitsi meeting link
     */
    public String generateMeetingLink(String roomName) {
        return "https://" + JITSI_DOMAIN + "/" + roomName;
    }
}