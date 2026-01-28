package com.aethercare.backend.chatbot.model.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class AgentResult {
    private final String agentName;
    private final boolean success;
    private final String message;
    private final Double confidence;
    private final ConversationContext updatedContext;
    private final Map<String, Object> metadata;
    
    public static AgentResult success(String agentName, ConversationContext context) {
        return AgentResult.builder()
            .agentName(agentName)
            .success(true)
            .updatedContext(context)
            .build();
    }
    
    public static AgentResult failure(String agentName, String errorMessage) {
        return AgentResult.builder()
            .agentName(agentName)
            .success(false)
            .message(errorMessage)
            .build();
    }
}
