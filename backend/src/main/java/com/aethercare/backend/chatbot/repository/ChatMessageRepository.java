package com.aethercare.backend.chatbot.repository;

import com.aethercare.backend.chatbot.model.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<ChatMessage> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);
    void deleteByConversationId(String conversationId);
}