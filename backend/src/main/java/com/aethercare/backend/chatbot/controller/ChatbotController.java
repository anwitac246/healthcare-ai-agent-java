package com.aethercare.backend.chatbot.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.chatbot.integration.document.DocumentParser;
import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.request.ChatRequest;
import com.aethercare.backend.chatbot.model.response.ChatResponse;
import com.aethercare.backend.chatbot.service.context.ConversationContextService;
import com.aethercare.backend.chatbot.service.orchestrator.ChatOrchestrator;
import com.aethercare.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Collections;

@Slf4j
@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    
    private final ChatOrchestrator orchestrator;
    private final ConversationContextService contextService;
    private final DocumentParser documentParser;
    
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Chat request from user: {}", userDetails.getFirebaseUid());
        
        try {
            ConversationContext initialContext = contextService.buildContext(
                request,
                userDetails.getFirebaseUid()
            );
            
            ConversationContext finalContext = orchestrator.processMessage(initialContext);
            
            contextService.saveMessage(finalContext, "user", request.getMessage());
            contextService.saveMessage(finalContext, "assistant", finalContext.getDiagnosisSummary());
            
            ChatResponse response = ChatResponse.builder()
                .message(finalContext.getDiagnosisSummary())
                .confidence(finalContext.getConfidenceScore())
                .intent(finalContext.getDetectedIntent())
                .requiresHumanReview(finalContext.isRequiresHumanReview())
                .safetyCheck(finalContext.getSafetyCheck())
                .conversationId(finalContext.getConversationId())
                .suggestedQuestions(Collections.emptyList())
                .build();
            
            return ResponseEntity.ok(ApiResponse.success(response));
            
        } catch (Exception e) {
            log.error("Chat processing failed", e);
            return ResponseEntity.status(500).body(
                ApiResponse.success("Chat processing failed: " + e.getMessage(), null)
            );
        }
    }
    
    @PostMapping("/upload-document")
    public ResponseEntity<ApiResponse<String>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String conversationId,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Document upload from user: {}", userDetails.getFirebaseUid());
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(
                ApiResponse.success("File is empty", null)
            );
        }
        
        long maxFileSize = 10 * 1024 * 1024;
        if (file.getSize() > maxFileSize) {
            return ResponseEntity.badRequest().body(
                ApiResponse.success("File size exceeds maximum limit of 10MB", null)
            );
        }
        
        try {
            String analysis = documentParser.parseDocument(file);
            
            return ResponseEntity.ok(ApiResponse.success(
                "Document analyzed successfully", 
                analysis
            ));
            
        } catch (Exception e) {
            log.error("Document upload failed", e);
            return ResponseEntity.status(500).body(
                ApiResponse.success("Document upload failed: " + e.getMessage(), null)
            );
        }
    }
    
    @GetMapping("/history/{conversationId}")
    public ResponseEntity<ApiResponse<Object>> getConversationHistory(
            @PathVariable String conversationId,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Fetching conversation history: {}", conversationId);
        
        try {
            var history = contextService.getConversationHistory(conversationId, 50);
            return ResponseEntity.ok(ApiResponse.success(history));
        } catch (Exception e) {
            log.error("Failed to fetch conversation history", e);
            return ResponseEntity.status(500).body(
                ApiResponse.success("Failed to fetch history: " + e.getMessage(), null)
            );
        }
    }
}
