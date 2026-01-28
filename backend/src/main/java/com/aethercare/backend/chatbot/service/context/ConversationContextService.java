package com.aethercare.backend.chatbot.service.context;

import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.entity.ChatMessage;
import com.aethercare.backend.chatbot.model.request.ChatRequest;
import com.aethercare.backend.chatbot.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationContextService {
    
    private final ChatMessageRepository chatMessageRepository;
    
    public ConversationContext buildContext(ChatRequest request, String userId) {
        String conversationId = request.getConversationId() != null 
            ? request.getConversationId() 
            : UUID.randomUUID().toString();
        
        List<ChatMessage> history = chatMessageRepository
            .findByConversationIdOrderByCreatedAtAsc(conversationId);
        
        return ConversationContext.builder()
            .conversationId(conversationId)
            .userId(userId)
            .currentMessage(request.getMessage())
            .messageHistory(history)
            .timestamp(Instant.now())
            .agentMetadata(new HashMap<>())
            .build();
    }
    
    public void saveMessage(ConversationContext context, String role, String content) {
        ChatMessage message = ChatMessage.builder()
            .conversationId(context.getConversationId())
            .userId(context.getUserId())
            .role(role)
            .content(content)
            .intent(context.getDetectedIntent())
            .confidence(context.getConfidenceScore())
            .metadata(context.getAgentMetadata())
            .timestamp(Instant.now())
            .createdAt(Instant.now())
            .build();
        
        chatMessageRepository.save(message);
        log.debug("Saved message for conversation: {}", context.getConversationId());
    }
    
    public List<ChatMessage> getConversationHistory(String conversationId, int limit) {
        return chatMessageRepository.findByConversationIdOrderByCreatedAtDesc(
            conversationId,
            org.springframework.data.domain.PageRequest.of(0, limit)
        );
    }
}
