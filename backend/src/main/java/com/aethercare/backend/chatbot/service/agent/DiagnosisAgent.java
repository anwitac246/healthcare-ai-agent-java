package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import com.aethercare.backend.chatbot.integration.pubmed.PubMedService;
import com.aethercare.backend.chatbot.integration.pubmed.dto.PubMedSearchResponse;
import com.aethercare.backend.chatbot.integration.pubmed.dto.PubMedArticle;
import com.aethercare.backend.chatbot.model.entity.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.regex.*;
import java.util.stream.Collectors;
import java.util.*;

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
            // CRITICAL: Accumulate ALL symptoms from history first
            List<MedicalEntity> allSymptoms = accumulateAllSymptoms(context);
            
            log.info("Total accumulated symptoms: {}", allSymptoms.size());
            for (MedicalEntity symptom : allSymptoms) {
                log.debug("  - {} (from: {})", symptom.getValue(), symptom.getSource());
            }
            
            // Update context with accumulated symptoms
            context = context.toBuilder()
                .extractedSymptoms(allSymptoms)
                .build();
            
            // Handle different intent types
            switch (intent) {
                case "symptom_query":
                    diagnosis = handleSymptomQuery(context);
                    confidence = extractConfidence(diagnosis);
                    break;
                    
                case "follow_up":
                case "document_question":
                    diagnosis = handleFollowUpOrDocumentQuestion(context);
                    confidence = Math.min(90.0, (context.getConfidenceScore() != null ? context.getConfidenceScore() : 70.0) + 5.0);
                    break;
                    
                case "emergency":
                    diagnosis = handleEmergency(context);
                    confidence = 100.0;
                    break;
                    
                case "general_question":
                default:
                    diagnosis = handleGeneralQuestion(context);
                    confidence = 70.0;
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
    
    /**
     * CRITICAL METHOD: Accumulates ALL symptoms from entire conversation history
     */
    private List<MedicalEntity> accumulateAllSymptoms(ConversationContext context) {
        Map<String, MedicalEntity> allSymptomsMap = new LinkedHashMap<>();
        
        // 1. Add current symptoms
        if (context.getExtractedSymptoms() != null) {
            for (MedicalEntity symptom : context.getExtractedSymptoms()) {
                String key = symptom.getValue().toLowerCase();
                allSymptomsMap.putIfAbsent(key, symptom);
            }
        }
        
        // 2. Extract symptoms from message history metadata
        if (context.getMessageHistory() != null) {
            for (ChatMessage message : context.getMessageHistory()) {
                if (message.getMetadata() == null) continue;
                
                Object symptomsObj = message.getMetadata().get("symptoms");
                if (symptomsObj instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> symptomsList = (List<Map<String, Object>>) symptomsObj;
                    
                    for (Map<String, Object> symptomMap : symptomsList) {
                        String value = (String) symptomMap.get("value");
                        String type = (String) symptomMap.get("type");
                        Double confidence = symptomMap.get("confidence") instanceof Number ? 
                            ((Number) symptomMap.get("confidence")).doubleValue() : 0.8;
                        String source = (String) symptomMap.get("source");
                        
                        if (value != null) {
                            String key = value.toLowerCase();
                            allSymptomsMap.putIfAbsent(key, MedicalEntity.builder()
                                .type(type != null ? type : "SYMPTOM")
                                .value(value)
                                .confidence(confidence)
                                .source(source != null ? source : "HISTORY")
                                .build());
                        }
                    }
                }
            }
        }
        
        // 3. Parse symptoms from previous assistant responses
        if (context.getMessageHistory() != null) {
            for (ChatMessage message : context.getMessageHistory()) {
                if ("assistant".equals(message.getRole())) {
                    List<String> parsedSymptoms = parseSymptonsFromText(message.getContent());
                    for (String symptom : parsedSymptoms) {
                        String key = symptom.toLowerCase();
                        allSymptomsMap.putIfAbsent(key, MedicalEntity.builder()
                            .type("SYMPTOM")
                            .value(symptom)
                            .confidence(0.7)
                            .source("PARSED_HISTORY")
                            .build());
                    }
                }
            }
        }
        
        List<MedicalEntity> result = new ArrayList<>(allSymptomsMap.values());
        log.info("Accumulated {} total unique symptoms", result.size());
        
        return result;
    }
    
    /**
     * Parse symptoms mentioned in previous responses
     */
    private List<String> parseSymptonsFromText(String text) {
        List<String> symptoms = new ArrayList<>();
        
        // Look for "Reported Symptoms:" or "Symptoms:" section
        Pattern sectionPattern = Pattern.compile(
            "(?:Reported\\s+)?Symptoms?:\\s*\\n(.*?)(?:\\n\\n|\\n[A-Z]|$)",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE
        );
        Matcher sectionMatcher = sectionPattern.matcher(text);
        
        if (sectionMatcher.find()) {
            String symptomSection = sectionMatcher.group(1);
            String[] lines = symptomSection.split("\\n");
            
            for (String line : lines) {
                String cleaned = line.trim()
                    .replaceAll("^[*\\-•\\d+\\.\\)]+\\s*", "")
                    .trim();
                    
                if (!cleaned.isEmpty() && cleaned.length() > 2 && !cleaned.startsWith("**")) {
                    symptoms.add(cleaned);
                }
            }
        }
        
        return symptoms;
    }
    
    private String handleSymptomQuery(ConversationContext context) {
        if (context.getExtractedSymptoms() == null || context.getExtractedSymptoms().isEmpty()) {
            log.warn("No symptoms extracted for symptom_query");
            return handleGeneralQuestion(context);
        }
        
        // Query PubMed with ALL accumulated symptoms
        String symptomText = context.getExtractedSymptoms().stream()
            .map(MedicalEntity::getValue)
            .collect(Collectors.joining(" "));
        
        log.info("Querying PubMed for ALL symptoms: {}", symptomText);
        
        PubMedSearchResponse pubmedResponse = pubMedService.searchBySymptoms(symptomText, 10, 5);
        
        String researchSummary = "";
        if (pubmedResponse != null && pubmedResponse.isSuccess() && 
            pubmedResponse.getArticles() != null && !pubmedResponse.getArticles().isEmpty()) {
            researchSummary = buildDetailedResearchSummary(pubmedResponse);
            log.info("Found {} PubMed articles for diagnosis", pubmedResponse.getArticles().size());
        } else {
            log.warn("No PubMed research found");
        }
        
        String prompt = buildSymptomPrompt(context, researchSummary);
        return groqService.complete(prompt);
    }
    
    private String handleFollowUpOrDocumentQuestion(ConversationContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. This is a FOLLOW-UP question in an ongoing consultation.\n\n");
        
        // CRITICAL: Include ALL accumulated symptoms
        if (context.getExtractedSymptoms() != null && !context.getExtractedSymptoms().isEmpty()) {
            prompt.append("**All Reported Symptoms (current and previous):**\n");
            for (MedicalEntity symptom : context.getExtractedSymptoms()) {
                prompt.append("- ").append(symptom.getValue()).append("\n");
            }
            prompt.append("\n");
        }
        
        // Add previous diagnosis/assessment if available
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            prompt.append("**Previous Assessment:**\n");
            
            // Find the last assistant response with significant content
            for (int i = context.getMessageHistory().size() - 1; i >= 0; i--) {
                ChatMessage msg = context.getMessageHistory().get(i);
                if ("assistant".equals(msg.getRole()) && msg.getContent() != null && msg.getContent().length() > 100) {
                    // Extract just the diagnosis/conditions part
                    String content = msg.getContent();
                    if (content.contains("Possible Conditions")) {
                        int start = content.indexOf("Possible Conditions");
                        int end = content.indexOf("Medications:");
                        if (end == -1) end = content.indexOf("Severity:");
                        if (end == -1) end = Math.min(start + 500, content.length());
                        
                        prompt.append(content.substring(start, end).trim()).append("\n\n");
                    }
                    break;
                }
            }
        }
        
        // Add document analysis if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("**Uploaded Document Analysis:**\n");
            prompt.append(context.getDocumentAnalysis()).append("\n\n");
        }
        
        // Add current question
        prompt.append("**New Information/Question:**\n");
        prompt.append(context.getCurrentMessage()).append("\n\n");
        
        prompt.append("""
            **Instructions:**
            1. INTEGRATE the new information with the previous assessment
            2. Update the diagnosis considering ALL symptoms (old + new)
            3. Explain how this new information changes or confirms the assessment
            4. Provide updated recommendations if needed
            5. Include specific medication recommendations with dosages
            
            **MEDICATION FORMAT**: Use this exact format:
            Medications:
            * Medication Name dosage (e.g., Ibuprofen 400mg every 6 hours)
            
            Format response in clean markdown without emojis.
            Keep under 600 words.
            Maintain or increase confidence based on additional information.
            """);
        
        return groqService.complete(prompt.toString());
    }
    
    private String handleGeneralQuestion(ConversationContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical AI assistant. Answer this medical question:\n\n");
        prompt.append("**Question:** ").append(context.getCurrentMessage()).append("\n\n");
        
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
            # ⚠️ EMERGENCY SITUATION DETECTED
            
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
        
        // Add ALL accumulated symptoms
        prompt.append("**All Reported Symptoms (current and previous):**\n");
        context.getExtractedSymptoms().forEach(s -> 
            prompt.append("- ").append(s.getValue()).append("\n"));
        prompt.append("\n");
        
        // Add document analysis if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            prompt.append("**Medical Document Analysis:**\n");
            prompt.append(context.getDocumentAnalysis()).append("\n\n");
        }
        
        // Add PubMed research if available
        if (!researchSummary.isEmpty()) {
            prompt.append(researchSummary).append("\n\n");
        }
        
        prompt.append("""
            **Instructions:**
            Based on ALL symptoms listed above and research provided:
            
            1. **Possible Conditions**: List 2-3 potential diagnoses
            2. **Evidence**: Cite research studies by PMID if available
            3. **Medications**: Recommend specific medications with dosages
            4. **Severity**: Indicate urgency level
            5. **Recommendations**: Specific next steps
            6. **Confidence**: Provide percentage (format: "Confidence: XX%")
            
            **MEDICATION FORMAT**: Use this exact format:
            Medications:
            * Medication Name dosage instructions (e.g., Ibuprofen 400mg every 6 hours for pain)
            * Another Medication dosage instructions
            
            Format in clean markdown without emojis.
            Keep under 600 words.
            """);
        
        return prompt.toString();
    }
    
    private String buildDetailedResearchSummary(PubMedSearchResponse response) {
        if (!response.isSuccess() || response.getArticles().isEmpty()) {
            return "";
        }
        
        StringBuilder summary = new StringBuilder();
        summary.append("**Recent Medical Research Findings:**\n\n");
        
        int count = Math.min(5, response.getArticles().size());
        for (int i = 0; i < count; i++) {
            PubMedArticle article = response.getArticles().get(i);
            
            summary.append(String.format("**Study %d** (PMID: %s):\n", i + 1, article.getPmid()));
            summary.append("Title: ").append(article.getTitle()).append("\n");
            
            if (article.getJournal() != null && article.getPublicationYear() != null) {
                summary.append(String.format("Published in: %s (%d)\n", 
                    article.getJournal(), article.getPublicationYear()));
            }
            
            if (article.getAbstractText() != null) {
                String truncatedAbstract = article.getAbstractText().length() > 300
                        ? article.getAbstractText().substring(0, 300) + "..."
                        : article.getAbstractText();
                summary.append("Abstract: ").append(truncatedAbstract).append("\n");
            }
            
            summary.append("\n");
        }
        
        return summary.toString();
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