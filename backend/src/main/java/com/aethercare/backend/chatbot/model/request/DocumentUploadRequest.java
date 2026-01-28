package com.aethercare.backend.chatbot.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class DocumentUploadRequest {
    
    @NotNull(message = "File is required")
    private MultipartFile file;
    private String conversationId;
    private String description;
}
