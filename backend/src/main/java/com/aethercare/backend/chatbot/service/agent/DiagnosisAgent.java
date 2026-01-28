package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import com.aethercare.backend.chatbot.integration.pubmed.PubMedService;
import com.aethercare.backend.chatbot.integration.pubmed.dto.PubMedSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.regex.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DiagnosisAgent implements ChatAgent {
    
    private final GroqService groqService;
    private final PubMedService pubMedService;
    
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
        
        // Step 1: Query PubMed for research
        String symptomText = context.getExtractedSymptoms().stream()
            .map(MedicalEntity::getValue)
            .collect(Collectors.joining(", "));
        
        PubMedSearchResponse pubmedResponse = pubMedService.searchBySymptoms(symptomText, 5, 10);
        String researchSummary = pubMedService.buildResearchSummary(pubmedResponse);
        
        // Step 2: Build comprehensive diagnosis prompt
        String prompt = buildDiagnosisPrompt(context, researchSummary);
        
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
    
    private String buildDiagnosisPrompt(ConversationContext context, String researchSummary) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. Provide a preliminary diagnosis based on:\n\n");
        
        // Add chat history context
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            prompt.append("**Previous Conversation:**\n");
            context.getMessageHistory().stream()
                .limit(5)
                .forEach(msg -> prompt.append(msg.getRole())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n"));
            prompt.append("\n");
        }
        
        // Add symptoms
        prompt.append("**Symptoms:**\n");
        context.getExtractedSymptoms().forEach(s -> 
            prompt.append("- ").append(s.getValue()).append("\n"));
        prompt.append("\n");
        
        // Add document analysis if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("**Uploaded Medical Document Analysis:**\n");
            prompt.append(context.getDocumentAnalysis()).append("\n\n");
        }
        
        // Add PubMed research
        prompt.append("**Relevant Medical Research:**\n");
        prompt.append(researchSummary).append("\n\n");
        
        prompt.append("""
            **Instructions:**
            Based on the above information, provide:
            
            1. **Possible Conditions**: List 2-3 potential diagnoses
            2. **Evidence**: Reference the research studies provided
            3. **Severity Assessment**: Indicate urgency level
            4. **Recommendations**: Next steps for the patient
            5. **Confidence**: Provide confidence percentage (format: "Confidence: XX%")
            
            Format your response in clean markdown without emojis.
            Keep response under 400 words.
            Be evidence-based and cite the research.
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