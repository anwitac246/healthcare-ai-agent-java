package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentAnalysisAgent implements ChatAgent {
    
    @Override
    public AgentResult execute(ConversationContext context) {
        if (context.getAgentMetadata() == null || 
            context.getAgentMetadata().get("documentAnalysis") == null) {
            return AgentResult.success(getAgentName(), context);
        }
        
        String documentAnalysis = (String) context.getAgentMetadata().get("documentAnalysis");
        
        ConversationContext updatedContext = context.toBuilder()
            .documentAnalysis(documentAnalysis)
            .build();
        
        return AgentResult.builder()
            .agentName(getAgentName())
            .success(true)
            .updatedContext(updatedContext)
            .build();
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