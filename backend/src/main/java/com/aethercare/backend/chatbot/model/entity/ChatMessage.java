package com.aethercare.backend.chatbot.model.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import java.time.Instant;
import java.util.Map;

@Data
@Builder
@Document(collection = "chat_messages")
public class ChatMessage {
    
    @Id
    private String id;
    
    @Indexed
    private String conversationId;
    
    @Indexed
    private String userId;
    
    private String role;
    private String content;
    private String intent;
    private Double confidence;
    private Map<String, Object> metadata;
    private Instant timestamp;
    
    private Boolean reportGenerated;
    private String reportId;
    
    @Indexed
    private Instant createdAt;
}