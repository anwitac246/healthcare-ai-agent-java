package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ResponseSynthesisAgent implements ChatAgent {
    
    private static final String MEDICAL_DISCLAIMER = 
        "\n\n**⚕️ Medical Disclaimer**: This is AI-generated information and NOT a substitute " +
        "for professional medical advice. Please consult a licensed healthcare provider for " +
        "accurate diagnosis and treatment.";
    
    @Override
    public AgentResult execute(ConversationContext context) {
        log.info("ResponseSynthesisAgent formatting final response");
        
        StringBuilder response = new StringBuilder();
        
        if (context.getDiagnosisSummary() != null && !context.getDiagnosisSummary().isEmpty()) {
            response.append(context.getDiagnosisSummary());
        } else {
            response.append("I'm here to help. Please describe your symptoms in more detail.");
        }
        
        if (context.getRiskFactors() != null && !context.getRiskFactors().isEmpty()) {
            response.append("\n\n**Risk Factors Identified:**\n");
            context.getRiskFactors().forEach(risk -> 
                response.append("- ").append(risk).append("\n")
            );
        }
        
        String riskLevel = (String) context.getAgentMetadata().get("risk_level");
        if (riskLevel != null) {
            response.append("\n\n**Recommendation:** ");
            response.append(getRecommendation(riskLevel));
        }
        
        response.append(MEDICAL_DISCLAIMER);
        
        ConversationContext updatedContext = context.toBuilder()
            .diagnosisSummary(response.toString())
            .build();
        
        return AgentResult.builder()
            .agentName(getAgentName())
            .success(true)
            .updatedContext(updatedContext)
            .build();
    }
    
    private String getRecommendation(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL" -> "**SEEK IMMEDIATE EMERGENCY CARE** - Call emergency services or visit ER immediately.";
            case "HIGH" -> "Schedule an appointment with your doctor **within 24 hours**.";
            case "MEDIUM" -> "Consult your healthcare provider **within a few days**.";
            default -> "Monitor symptoms and consult a doctor if they worsen.";
        };
    }
    
    @Override
    public String getAgentName() {
        return "ResponseSynthesisAgent";
    }
    
    @Override
    public int getPriority() {
        return 6;
    }
    
    @Override
    public boolean isCritical() {
        return true;
    }
}