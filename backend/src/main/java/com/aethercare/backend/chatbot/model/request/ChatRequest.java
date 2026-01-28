package com.aethercare.backend.chatbot.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class ChatRequest {
    
    @NotBlank(message = "Message cannot be empty")
    @Size(max = 5000, message = "Message exceeds maximum length")
    private String message;
    
    private String conversationId;
    private List<MessageHistory> history;
    
    @Data
    public static class MessageHistory {
        private String role;
        private String content;
    }
}