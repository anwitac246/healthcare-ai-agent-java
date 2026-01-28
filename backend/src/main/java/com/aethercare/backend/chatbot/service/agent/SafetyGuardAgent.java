package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class SafetyGuardAgent implements ChatAgent {
    
    private static final Double MIN_CONFIDENCE_THRESHOLD = 60.0;
    private static final List<String> EMERGENCY_KEYWORDS = List.of(
        "chest pain", "can't breathe", "cannot breathe", "severe bleeding", 
        "unconscious", "suicide", "kill myself", "shortness of breath",
        "heart attack", "stroke", "seizure"
    );
    
    @Override
    public AgentResult execute(ConversationContext context) {
        log.info("SafetyGuardAgent performing safety checks");
        
        List<String> flaggedKeywords = detectEmergencyKeywords(context);
        boolean hasEmergency = !flaggedKeywords.isEmpty();
        
        SafetyCheck safetyCheck = SafetyCheck.builder()
            .hasEmergencyKeywords(hasEmergency)
            .confidenceBelowThreshold(isConfidenceLow(context))
            .requiresDisclaimer(true)
            .hallucinationRisk(detectHallucination(context))
            .flaggedKeywords(flaggedKeywords)
            .emergencyMessage(hasEmergency ? "EMERGENCY DETECTED - SEEK IMMEDIATE MEDICAL ATTENTION" : null)
            .build();
        
        ConversationContext updatedContext = context.withSafetyCheck(safetyCheck);
        
        if (hasEmergency) {
            log.warn("EMERGENCY DETECTED in conversation: {}", context.getConversationId());
            updatedContext = updatedContext.toBuilder()
                .diagnosisSummary("⚠️ **EMERGENCY SITUATION DETECTED**\n\n" +
                    "Please call emergency services immediately (911 in US) or visit the nearest hospital emergency room.\n\n" +
                    "This is a potentially life-threatening situation that requires immediate professional medical attention.")
                .requiresHumanReview(true)
                .confidenceScore(100.0)
                .build();
        }
        
        return AgentResult.builder()
            .agentName(getAgentName())
            .success(true)
            .updatedContext(updatedContext)
            .metadata(Map.of("safety_check", safetyCheck))
            .build();
    }
    
    private List<String> detectEmergencyKeywords(ConversationContext context) {
        List<String> flagged = new ArrayList<>();
        String message = context.getCurrentMessage();
        if (message == null) {
            return flagged;
        }
        
        String lowerMessage = message.toLowerCase();
        
        for (String keyword : EMERGENCY_KEYWORDS) {
            if (lowerMessage.contains(keyword)) {
                flagged.add(keyword);
            }
        }
        
        return flagged;
    }
    
    private boolean isConfidenceLow(ConversationContext context) {
        if (context.getConfidenceScore() == null) {
            return true;
        }
        return context.getConfidenceScore() < MIN_CONFIDENCE_THRESHOLD;
    }
    
    private boolean detectHallucination(ConversationContext context) {
        String diagnosis = context.getDiagnosisSummary();
        if (diagnosis == null) return false;
        
        return diagnosis.length() > 1000 && isConfidenceLow(context);
    }
    
    @Override
    public String getAgentName() {
        return "SafetyGuardAgent";
    }
    
    @Override
    public int getPriority() {
        return 99;
    }
    
    @Override
    public boolean isCritical() {
        return true;
    }
}
