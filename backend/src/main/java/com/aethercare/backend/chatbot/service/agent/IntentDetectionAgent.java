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
        
        String prompt = String.format("""
            Classify the following patient message into one of these intents:
            - symptom_query: Patient describing symptoms
            - follow_up: Follow-up to previous diagnosis
            - emergency: Life-threatening situation
            - general_question: Medical information request
            
            Message: "%s"
            
            Respond with ONLY the intent name, no explanation.
            """, context.getCurrentMessage());
        
        try {
            String groqResponse = groqService.complete(prompt);
            String intent = groqResponse.trim().toLowerCase().replaceAll("[^a-z_]", "");
            
            if (intent.isEmpty()) {
                intent = "general_question";
            }
            
            ConversationContext updatedContext = context.withIntent(intent);
            
            return AgentResult.builder()
                .agentName(getAgentName())
                .success(true)
                .confidence(0.85)
                .updatedContext(updatedContext)
                .build();
                
        } catch (Exception e) {
            log.error("Intent detection failed", e);
            ConversationContext fallbackContext = context.withIntent("general_question");
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