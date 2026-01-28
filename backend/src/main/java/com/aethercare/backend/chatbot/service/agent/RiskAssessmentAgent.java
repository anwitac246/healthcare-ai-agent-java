package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class RiskAssessmentAgent implements ChatAgent {
    
    private static final Map<String, Integer> SYMPTOM_SEVERITY = Map.ofEntries(
        Map.entry("chest pain", 10),
        Map.entry("difficulty breathing", 10),
        Map.entry("shortness of breath", 10),
        Map.entry("severe bleeding", 10),
        Map.entry("unconscious", 10),
        Map.entry("severe headache", 8),
        Map.entry("confusion", 8),
        Map.entry("fever", 5),
        Map.entry("headache", 3),
        Map.entry("cough", 2),
        Map.entry("fatigue", 2)
    );
    
    @Override
    public AgentResult execute(ConversationContext context) {
        log.info("RiskAssessmentAgent evaluating risk");
        
        List<String> riskFactors = new ArrayList<>();
        int totalRiskScore = 0;
        
        if (context.getExtractedSymptoms() != null) {
            for (MedicalEntity symptom : context.getExtractedSymptoms()) {
                String symptomLower = symptom.getValue().toLowerCase();
                int score = SYMPTOM_SEVERITY.getOrDefault(symptomLower, 1);
                totalRiskScore += score;
                
                if (score >= 8) {
                    riskFactors.add(symptom.getValue() + " (HIGH RISK)");
                }
            }
        }
        
        if (hasDangerousCombination(context)) {
            riskFactors.add("DANGEROUS_SYMPTOM_COMBINATION");
            totalRiskScore += 15;
        }
        
        String riskLevel = determineRiskLevel(totalRiskScore);
        
        ConversationContext updatedContext = context.toBuilder()
            .riskFactors(riskFactors)
            .build();
        
        Map<String, Object> metadata = new HashMap<>(updatedContext.getAgentMetadata());
        metadata.put("risk_score", totalRiskScore);
        metadata.put("risk_level", riskLevel);
        
        updatedContext = updatedContext.toBuilder()
            .agentMetadata(metadata)
            .build();
        
        return AgentResult.builder()
            .agentName(getAgentName())
            .success(true)
            .updatedContext(updatedContext)
            .metadata(Map.of(
                "risk_score", totalRiskScore,
                "risk_level", riskLevel
            ))
            .build();
    }
    
    private boolean hasDangerousCombination(ConversationContext context) {
        if (context.getExtractedSymptoms() == null || context.getExtractedSymptoms().size() < 2) {
            return false;
        }
        
        Set<String> symptoms = new HashSet<>();
        context.getExtractedSymptoms().forEach(s -> symptoms.add(s.getValue().toLowerCase()));
        
        if (symptoms.contains("chest pain") && 
            (symptoms.contains("difficulty breathing") || symptoms.contains("shortness of breath"))) {
            return true;
        }
        
        if (symptoms.contains("severe headache") && symptoms.contains("confusion")) {
            return true;
        }
        
        return false;
    }
    
    private String determineRiskLevel(int score) {
        if (score >= 20) return "CRITICAL";
        if (score >= 10) return "HIGH";
        if (score >= 5) return "MEDIUM";
        return "LOW";
    }
    
    @Override
    public String getAgentName() {
        return "RiskAssessmentAgent";
    }
    
    @Override
    public int getPriority() {
        return 5;
    }
    
    @Override
    public boolean isCritical() {
        return false;
    }
}
