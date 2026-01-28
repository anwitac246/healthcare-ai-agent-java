package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.regex.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DiagnosisAgent implements ChatAgent {
    
    private final GroqService groqService;
    
    @Override
    public AgentResult execute(ConversationContext context) {
        if (!"symptom_query".equals(context.getDetectedIntent())) {
            log.debug("Skipping DiagnosisAgent - intent is not symptom_query");
            return AgentResult.success(getAgentName(), context);
        }
        
        if (context.getExtractedSymptoms() == null || context.getExtractedSymptoms().isEmpty()) {
            log.warn("No symptoms extracted, skipping diagnosis");
            return AgentResult.success(getAgentName(), context);
        }
        
        log.info("DiagnosisAgent analyzing symptoms for conversation: {}", context.getConversationId());
        
        String prompt = buildDiagnosisPrompt(context);
        
        try {
            String diagnosis = groqService.complete(prompt);
            Double confidence = extractConfidence(diagnosis);
            
            ConversationContext updatedContext = context.toBuilder()
                .diagnosisSummary(diagnosis)
                .confidenceScore(confidence)
                .build();
            
            return AgentResult.builder()
                .agentName(getAgentName())
                .success(true)
                .confidence(confidence)
                .updatedContext(updatedContext)
                .build();
                
        } catch (Exception e) {
            log.error("Diagnosis generation failed", e);
            ConversationContext fallbackContext = context.toBuilder()
                .diagnosisSummary("Unable to generate diagnosis. Please consult a healthcare professional.")
                .confidenceScore(0.0)
                .build();
            return AgentResult.success(getAgentName(), fallbackContext);
        }
    }
    
    private String buildDiagnosisPrompt(ConversationContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Based on the following information, provide a preliminary diagnosis:\n\n");
        
        prompt.append("Symptoms: ");
        context.getExtractedSymptoms().forEach(s -> 
            prompt.append(s.getValue()).append(", "));
        prompt.append("\n");
        
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("Document Analysis: ").append(context.getDocumentAnalysis()).append("\n");
        }
        
        prompt.append("""
            
            Provide:
            1. Most likely condition
            2. Confidence percentage (format: "Confidence: XX%")
            3. Recommended next steps
            
            Keep response under 300 words.
            """);
        
        return prompt.toString();
    }
    
    private Double extractConfidence(String diagnosis) {
        Pattern pattern = Pattern.compile("Confidence:\\s*(\\d+)%");
        Matcher matcher = pattern.matcher(diagnosis);
        
        if (matcher.find()) {
            try {
                return Double.parseDouble(matcher.group(1));
            } catch (NumberFormatException e) {
                log.warn("Failed to parse confidence value");
            }
        }
        return 50.0;
    }
    
    @Override
    public String getAgentName() {
        return "DiagnosisAgent";
    }
    
    @Override
    public int getPriority() {
        return 4;
    }
    
    @Override
    public boolean isCritical() {
        return false;
    }
}
