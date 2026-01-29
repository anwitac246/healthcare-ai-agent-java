package com.aethercare.backend.chatbot.model.dto;

import com.aethercare.backend.chatbot.model.entity.ChatMessage;
import lombok.Builder;
import lombok.Data;
import lombok.With;
import java.time.Instant;
import java.util.*;

@Data
@Builder(toBuilder = true)
public class ConversationContext {
    
    private final String conversationId;
    private final String userId;
    private final String currentMessage;
    private final List<ChatMessage> messageHistory;
    private final String detectedIntent;
    private final List<MedicalEntity> extractedSymptoms;
    private final List<MedicalEntity> extractedConditions;
    private final String documentAnalysis;
    private final Double confidenceScore;
    private final List<String> riskFactors;
    private final String diagnosisSummary;
    private final SafetyCheck safetyCheck;
    private final boolean requiresHumanReview;
    private final Instant timestamp;
    private final Map<String, Object> agentMetadata;
    
    public ConversationContext withIntent(String intent) {
        return this.toBuilder().detectedIntent(intent).build();
    }
    
    public ConversationContext withSymptoms(List<MedicalEntity> symptoms) {
        return this.toBuilder().extractedSymptoms(symptoms).build();
    }
    
    public ConversationContext withSafetyCheck(SafetyCheck check) {
        return this.toBuilder().safetyCheck(check).build();
    }
}