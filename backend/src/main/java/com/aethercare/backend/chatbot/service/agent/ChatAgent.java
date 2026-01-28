package com.aethercare.backend.chatbot.service.agent;

import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.dto.AgentResult;

public interface ChatAgent {
    AgentResult execute(ConversationContext context);
    String getAgentName();
    int getPriority();
    boolean isCritical();
}