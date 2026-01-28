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
        String intent = context.getDetectedIntent();
        
        log.info("DiagnosisAgent processing intent: {} for conversation: {}", 
                intent, context.getConversationId());
        
        String diagnosis;
        Double confidence;
        
        try {
            // Handle different intent types
            switch (intent) {
                case "symptom_query":
                    diagnosis = handleSymptomQuery(context);
                    confidence = extractConfidence(diagnosis);
                    break;
                    
                case "follow_up":
                case "document_question":
                    diagnosis = handleFollowUpOrDocumentQuestion(context);
                    confidence = 0.8;
                    break;
                    
                case "emergency":
                    diagnosis = handleEmergency(context);
                    confidence = 1.0;
                    break;
                    
                case "general_question":
                default:
                    diagnosis = handleGeneralQuestion(context);
                    confidence = 0.7;
                    break;
            }
            
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
                .diagnosisSummary("I apologize, but I encountered an error. Could you please rephrase your question?")
                .confidenceScore(0.0)
                .build();
            return AgentResult.success(getAgentName(), fallbackContext);
        }
    }
    
    private String handleSymptomQuery(ConversationContext context) {
        if (context.getExtractedSymptoms() == null || context.getExtractedSymptoms().isEmpty()) {
            log.warn("No symptoms extracted for symptom_query");
            return handleGeneralQuestion(context);
        }
        
        // Query PubMed for research
        String symptomText = context.getExtractedSymptoms().stream()
            .map(MedicalEntity::getValue)
            .collect(Collectors.joining(", "));
        
        log.info("Querying PubMed for symptoms: {}", symptomText);
        PubMedSearchResponse pubmedResponse = pubMedService.searchBySymptoms(symptomText, 5, 10);
        String researchSummary = pubMedService.buildResearchSummary(pubmedResponse);
        
        String prompt = buildSymptomPrompt(context, researchSummary);
        return groqService.complete(prompt);
    }
    
    private String handleFollowUpOrDocumentQuestion(ConversationContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. Answer the follow-up question based on the conversation context.\n\n");
        
        // Add conversation history
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            prompt.append("**Previous Conversation:**\n");
            context.getMessageHistory().stream()
                .forEach(msg -> prompt.append("- ")
                    .append(msg.getRole())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n"));
            prompt.append("\n");
        }
        
        // Add document analysis if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("**Uploaded Document Analysis:**\n");
            prompt.append(context.getDocumentAnalysis()).append("\n\n");
        }
        
        // Add current question
        prompt.append("**Current Question:**\n");
        prompt.append(context.getCurrentMessage()).append("\n\n");
        
        prompt.append("""
            **Instructions:**
            Based on the conversation history and document analysis (if available):
            1. Provide a direct, relevant answer to the question
            2. Reference previous information when relevant
            3. If asking about lab results, analyze the values and explain
            4. Be conversational and helpful
            5. Use medical research if needed
            
            Format response in clean markdown without emojis.
            Keep it concise (under 300 words).
            """);
        
        return groqService.complete(prompt.toString());
    }
    
    private String handleGeneralQuestion(ConversationContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. Answer this medical question:\n\n");
        prompt.append("**Question:** ").append(context.getCurrentMessage()).append("\n\n");
        
        // Add context if available
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            prompt.append("**Previous Context:**\n");
            context.getMessageHistory().stream()
                .limit(3)
                .forEach(msg -> prompt.append("- ")
                    .append(msg.getRole())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n"));
            prompt.append("\n");
        }
        
        prompt.append("""
            **Instructions:**
            1. Provide accurate, evidence-based medical information
            2. Be concise and clear
            3. Reference medical research when relevant
            4. Include appropriate medical disclaimers
            
            Format in markdown without emojis.
            Keep under 250 words.
            """);
        
        return groqService.complete(prompt.toString());
    }
    
    private String handleEmergency(ConversationContext context) {
        return """
            # EMERGENCY SITUATION DETECTED
            
            **IMMEDIATE ACTION REQUIRED**
            
            Please call emergency services immediately:
            - **US/Canada**: 911
            - **UK**: 999
            - **EU**: 112
            
            Or visit the nearest hospital emergency room immediately.
            
            This appears to be a potentially life-threatening situation that requires immediate professional medical attention.
            
            **Do not wait** - seek emergency care now.
            
            ---
            
            **Medical Disclaimer**: This is an AI assessment and NOT a substitute for professional medical care. In emergency situations, always seek immediate medical attention.
            """;
    }
    
    private String buildSymptomPrompt(ConversationContext context, String researchSummary) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. Provide an evidence-based analysis.\n\n");
        
        // Add chat history context
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            prompt.append("**Previous Conversation:**\n");
            context.getMessageHistory().stream()
                .limit(5)
                .forEach(msg -> prompt.append("- ")
                    .append(msg.getRole())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n"));
            prompt.append("\n");
        }
        
        // Add symptoms
        prompt.append("**Reported Symptoms:**\n");
        context.getExtractedSymptoms().forEach(s -> 
            prompt.append("- ").append(s.getValue()).append("\n"));
        prompt.append("\n");
        
        // Add document analysis if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("**Medical Document Analysis:**\n");
            prompt.append(context.getDocumentAnalysis()).append("\n\n");
        }
        
        // Add PubMed research
        prompt.append("**Relevant Medical Research from PubMed:**\n");
        prompt.append(researchSummary).append("\n\n");
        
        prompt.append("""
            **Instructions:**
            Based on the above information, provide:
            
            1. **Possible Conditions**: List 2-3 potential diagnoses based on symptoms
            2. **Evidence**: Cite the research studies provided (reference PMID numbers)
            3. **Analysis**: If lab results provided, analyze values and explain abnormalities
            4. **Severity**: Indicate urgency level (routine, urgent, or emergency)
            5. **Recommendations**: Specific next steps
            6. **Confidence**: Provide percentage (format: "Confidence: XX%")
            
            Format in clean markdown without emojis.
            Keep under 500 words.
            Be evidence-based and cite research.
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
        return 70.0;
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