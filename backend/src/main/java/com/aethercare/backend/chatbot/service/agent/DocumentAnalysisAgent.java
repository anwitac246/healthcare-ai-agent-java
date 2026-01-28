package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentAnalysisAgent implements ChatAgent {
    
    private final GroqService groqService;
    
    @Override
    public AgentResult execute(ConversationContext context) {
        if (context.getAgentMetadata() == null) {
            return AgentResult.success(getAgentName(), context);
        }
        
        String documentText = (String) context.getAgentMetadata().get("documentText");
        String documentType = (String) context.getAgentMetadata().get("documentType");
        String fileName = (String) context.getAgentMetadata().get("fileName");
        
        if (documentText == null || documentText.trim().isEmpty()) {
            return AgentResult.success(getAgentName(), context);
        }
        
        log.info("Analyzing document: {} (type: {})", fileName, documentType);
        
        try {
            String analysis = analyzeDocument(documentText, documentType);
            
            Map<String, Object> metadata = new HashMap<>(context.getAgentMetadata());
            metadata.put("documentAnalysisComplete", true);
            metadata.put("documentName", fileName);
            
            ConversationContext updatedContext = context.toBuilder()
                .documentAnalysis(analysis)
                .agentMetadata(metadata)
                .build();
            
            return AgentResult.builder()
                .agentName(getAgentName())
                .success(true)
                .updatedContext(updatedContext)
                .metadata(Map.of(
                    "document_analyzed", true,
                    "document_name", fileName != null ? fileName : "unknown"
                ))
                .build();
                
        } catch (Exception e) {
            log.error("Document analysis failed", e);
            return AgentResult.success(getAgentName(), context);
        }
    }
    
    private String analyzeDocument(String documentText, String documentType) {
        String prompt = String.format("""
            Analyze the following medical document and extract key information.
            
            Document Type: %s
            
            Document Content:
            %s
            
            Provide a structured analysis including:
            1. **Key Medical Findings**: Lab results, diagnoses, test outcomes
            2. **Medications**: Any medications mentioned
            3. **Vital Signs**: If present (BP, HR, temp, etc.)
            4. **Symptoms**: Documented symptoms
            5. **Relevant Medical History**: Important background
            
            Format in clean markdown without emojis.
            Keep it concise (under 300 words).
            """,
            documentType != null ? documentType : "Unknown",
            documentText.substring(0, Math.min(documentText.length(), 3000))
        );
        
        return groqService.complete(prompt);
    }
    
    @Override
    public String getAgentName() {
        return "DocumentAnalysisAgent";
    }
    
    @Override
    public int getPriority() {
        return 3;
    }
    
    @Override
    public boolean isCritical() {
        return false;
    }
}