package com.aethercare.backend.chatbot.service.context;

import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.entity.ChatMessage;
import com.aethercare.backend.chatbot.model.entity.Conversation;
import com.aethercare.backend.chatbot.model.request.ChatRequest;
import com.aethercare.backend.chatbot.repository.ChatMessageRepository;
import com.aethercare.backend.chatbot.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationContextService {
    
    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;
    
    public ConversationContext buildContext(ChatRequest request, String userId) {
        String conversationId = request.getConversationId();
        
        // Create or get existing conversation
        if (conversationId == null || conversationId.isEmpty()) {
            conversationId = UUID.randomUUID().toString();
            
            // Create new conversation
            Conversation conversation = new Conversation();
            conversation.setId(conversationId);
            conversation.setUserId(userId);
            conversation.setTitle("New Consultation");
            conversation.setCreatedAt(Instant.now());
            conversation.setUpdatedAt(Instant.now());
            conversationRepository.save(conversation);
        }
        
        // Load conversation history
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
        
        // Update conversation
        updateConversation(context, content);
        
        log.debug("Saved message for conversation: {}", context.getConversationId());
    }
    
    private void updateConversation(ConversationContext context, String lastMessage) {
        conversationRepository.findById(context.getConversationId()).ifPresent(conversation -> {
            conversation.setLastMessage(lastMessage);
            conversation.setUpdatedAt(Instant.now());
            
            // Update title from first message if still "New Consultation"
            if ("New Consultation".equals(conversation.getTitle()) && 
                context.getCurrentMessage() != null) {
                String title = generateTitle(context.getCurrentMessage());
                conversation.setTitle(title);
            }
            
            conversationRepository.save(conversation);
        });
    }
    
    private String generateTitle(String firstMessage) {
        // Take first 50 chars or until first punctuation
        String title = firstMessage.trim();
        
        if (title.length() > 50) {
            title = title.substring(0, 50).trim();
            // Find last space to avoid cutting words
            int lastSpace = title.lastIndexOf(' ');
            if (lastSpace > 30) {
                title = title.substring(0, lastSpace);
            }
            title += "...";
        }
        
        return title;
    }
    
    public List<ChatMessage> getConversationHistory(String conversationId, int limit) {
        return chatMessageRepository.findByConversationIdOrderByCreatedAtDesc(
            conversationId,
            PageRequest.of(0, limit)
        );
    }
    
    public List<Conversation> getUserConversations(String userId, int limit) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(
            userId,
            PageRequest.of(0, limit)
        );
    }
}