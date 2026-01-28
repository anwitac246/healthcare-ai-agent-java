package com.aethercare.backend.chatbot.service.orchestrator;

import com.aethercare.backend.chatbot.model.dto.*;
import com.aethercare.backend.chatbot.service.agent.ChatAgent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Comparator;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatOrchestrator {
    
    private final List<ChatAgent> agents;
    
    public ConversationContext processMessage(ConversationContext initialContext) {
        log.info("Starting agent chain for conversation: {}", initialContext.getConversationId());
        
        List<ChatAgent> sortedAgents = agents.stream()
            .sorted(Comparator.comparingInt(ChatAgent::getPriority))
            .toList();
        
        ConversationContext currentContext = initialContext;
        
        for (ChatAgent agent : sortedAgents) {
            log.debug("Executing agent: {}", agent.getAgentName());
            
            AgentResult result = agent.execute(currentContext);
            
            if (!result.isSuccess()) {
                log.error("Agent {} failed: {}", agent.getAgentName(), result.getMessage());
                
                if (agent.isCritical()) {
                    log.error("Critical agent failed - halting chain");
                    throw new AgentExecutionException(
                        "Critical agent " + agent.getAgentName() + " failed: " + result.getMessage()
                    );
                }
                continue;
            }
            
            currentContext = result.getUpdatedContext();
            log.debug("Agent {} completed successfully", agent.getAgentName());
        }
        
        log.info("Agent chain completed for conversation: {}", currentContext.getConversationId());
        return currentContext;
    }
}
