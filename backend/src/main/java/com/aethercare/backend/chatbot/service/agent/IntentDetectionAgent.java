package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.dto.AgentResult;
import com.aethercare.backend.chatbot.integration.groq.GroqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class IntentDetectionAgent implements ChatAgent {
    
    private final GroqService groqService;
    
    @Override
    public AgentResult execute(ConversationContext context) {
        log.info("IntentDetectionAgent processing conversation: {}", context.getConversationId());
        
        if (context.getCurrentMessage() == null || context.getCurrentMessage().trim().isEmpty()) {
            return AgentResult.failure(getAgentName(), "Empty message");
        }
        
        // Build context-aware prompt
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Classify the following patient message into one of these intents:\n");
        promptBuilder.append("- symptom_query: Patient describing symptoms or asking about health concerns\n");
        promptBuilder.append("- follow_up: Follow-up question about previous diagnosis or document\n");
        promptBuilder.append("- document_question: Question about uploaded medical document\n");
        promptBuilder.append("- emergency: Life-threatening situation\n");
        promptBuilder.append("- general_question: General medical information request\n\n");
        
        // Add conversation context if available
        if (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) {
            promptBuilder.append("Previous conversation context:\n");
            context.getMessageHistory().stream()
                .limit(3)
                .forEach(msg -> promptBuilder.append(msg.getRole())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n"));
            promptBuilder.append("\n");
        }
        
        // Add document context if available
        if (context.getDocumentAnalysis() != null && !context.getDocumentAnalysis().isEmpty()) {
            promptBuilder.append("Note: User has uploaded a medical document.\n\n");
        }
        
        promptBuilder.append("Current message: \"").append(context.getCurrentMessage()).append("\"\n\n");
        promptBuilder.append("Respond with ONLY the intent name, no explanation.");
        
        String prompt = promptBuilder.toString();
        
        try {
            String groqResponse = groqService.complete(prompt);
            String intent = groqResponse.trim().toLowerCase().replaceAll("[^a-z_]", "");
            
            if (intent.isEmpty()) {
                // Default to follow_up if we have history, otherwise general_question
                intent = (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) 
                    ? "follow_up" 
                    : "general_question";
            }
            
            log.info("Detected intent: {} for message: {}", intent, context.getCurrentMessage());
            
            ConversationContext updatedContext = context.withIntent(intent);
            
            return AgentResult.builder()
                .agentName(getAgentName())
                .success(true)
                .confidence(0.85)
                .updatedContext(updatedContext)
                .build();
                
        } catch (Exception e) {
            log.error("Intent detection failed", e);
            // Default to follow_up if we have context, otherwise general_question
            String fallbackIntent = (context.getMessageHistory() != null && !context.getMessageHistory().isEmpty()) 
                ? "follow_up" 
                : "general_question";
            ConversationContext fallbackContext = context.withIntent(fallbackIntent);
            return AgentResult.success(getAgentName(), fallbackContext);
        }
    }
    
    @Override
    public String getAgentName() {
        return "IntentDetectionAgent";
    }
    
    @Override
    public int getPriority() {
        return 1;
    }
    
    @Override
    public boolean isCritical() {
        return false;
    }
}