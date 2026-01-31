package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class MedicalContextAgent implements ChatAgent {
    
    private final GroqService groqService;
    
    private static final List<String> SYMPTOM_KEYWORDS = List.of(
        "pain", "fever", "cough", "fatigue", "nausea", "vomiting", 
        "diarrhea", "headache", "rash", "swelling", "bleeding", "dizzy",
        "shortness of breath", "chest pain", "abdominal pain", "wbc", 
        "white blood cell", "elevated", "high count"
    );
    
    @Override
    public AgentResult execute(ConversationContext context) {
        log.info("MedicalContextAgent extracting entities");
        
        String message = context.getCurrentMessage();
        if (message == null || message.trim().isEmpty()) {
            return AgentResult.success(getAgentName(), context);
        }
        
        List<MedicalEntity> ruleBasedSymptoms = extractSymptomsRuleBased(message);
        List<MedicalEntity> llmSymptoms = extractSymptomsLLM(message);
        List<MedicalEntity> allSymptoms = mergeEntities(ruleBasedSymptoms, llmSymptoms);
        
        // CRITICAL: Store symptoms in metadata for persistence
        Map<String, Object> metadata = new HashMap<>(context.getAgentMetadata());
        
        // Convert symptoms to serializable format
        List<Map<String, Object>> symptomMaps = new ArrayList<>();
        for (MedicalEntity symptom : allSymptoms) {
            Map<String, Object> symptomMap = new HashMap<>();
            symptomMap.put("type", symptom.getType());
            symptomMap.put("value", symptom.getValue());
            symptomMap.put("confidence", symptom.getConfidence());
            symptomMap.put("source", symptom.getSource());
            symptomMaps.add(symptomMap);
        }
        metadata.put("symptoms", symptomMaps);
        
        ConversationContext updatedContext = context.toBuilder()
            .extractedSymptoms(allSymptoms)
            .agentMetadata(metadata)
            .build();
        
        return AgentResult.builder()
            .agentName(getAgentName())
            .success(true)
            .updatedContext(updatedContext)
            .metadata(Map.of(
                "rule_based_count", ruleBasedSymptoms.size(),
                "llm_count", llmSymptoms.size(),
                "total_count", allSymptoms.size()
            ))
            .build();
    }
    
    private List<MedicalEntity> extractSymptomsRuleBased(String message) {
        List<MedicalEntity> symptoms = new ArrayList<>();
        String lowerMessage = message.toLowerCase();
        
        for (String keyword : SYMPTOM_KEYWORDS) {
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(keyword) + "\\b", Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(lowerMessage);
            
            if (matcher.find()) {
                symptoms.add(MedicalEntity.builder()
                    .type("SYMPTOM")
                    .value(keyword)
                    .confidence(0.8)
                    .source("RULE_BASED")
                    .build());
            }
        }
        
        return symptoms;
    }
    
    private List<MedicalEntity> extractSymptomsLLM(String message) {
        String prompt = String.format("""
            Extract all medical symptoms from the following text.
            Return ONLY a comma-separated list of symptoms, nothing else.
            If no symptoms found, return "none".
            
            Text: "%s"
            
            Symptoms:
            """, message);
        
        try {
            String response = groqService.complete(prompt);
            if (response == null || response.trim().isEmpty() || response.toLowerCase().contains("none")) {
                return Collections.emptyList();
            }
            
            String[] symptoms = response.split(",");
            return Arrays.stream(symptoms)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> MedicalEntity.builder()
                    .type("SYMPTOM")
                    .value(s)
                    .confidence(0.9)
                    .source("LLM_EXTRACTED")
                    .build())
                .toList();
                
        } catch (Exception e) {
            log.error("LLM extraction failed", e);
            return Collections.emptyList();
        }
    }
    
    private List<MedicalEntity> mergeEntities(List<MedicalEntity> list1, List<MedicalEntity> list2) {
        Map<String, MedicalEntity> merged = new HashMap<>();
        
        list1.forEach(e -> merged.put(e.getValue().toLowerCase(), e));
        list2.forEach(e -> merged.putIfAbsent(e.getValue().toLowerCase(), e));
        
        return new ArrayList<>(merged.values());
    }
    
    @Override
    public String getAgentName() {
        return "MedicalContextAgent";
    }
    
    @Override
    public int getPriority() {
        return 2;
    }
    
    @Override
    public boolean isCritical() {
        return false;
    }
}