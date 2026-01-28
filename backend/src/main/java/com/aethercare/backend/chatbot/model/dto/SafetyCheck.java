package com.aethercare.backend.chatbot.model.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SafetyCheck {
    private boolean hasEmergencyKeywords;
    private boolean confidenceBelowThreshold;
    private boolean requiresDisclaimer;
    private boolean hallucinationRisk;
    private List<String> flaggedKeywords;
    private String emergencyMessage;
    
    public boolean isEmergency() {
        return hasEmergencyKeywords;
    }
    
    public boolean isSafe() {
        return !hallucinationRisk && !hasEmergencyKeywords;
    }
}