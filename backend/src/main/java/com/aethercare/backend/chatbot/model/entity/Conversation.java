package com.aethercare.backend.chatbot.model.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "conversations")
public class Conversation {
    
    @Id
    private String id;
    
    @Indexed
    private String userId;
    
    private String title;
    
    private String lastMessage;
    
    @Indexed
    private Instant createdAt;
    
    @Indexed
    private Instant updatedAt;
}