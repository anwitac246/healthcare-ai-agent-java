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
import java.util.HashMap;
import java.util.Map;

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
            // Build context with chat history
            ConversationContext initialContext = contextService.buildContext(
                request,
                userDetails.getFirebaseUid()
            );
            
            // Process through agent chain
            ConversationContext finalContext = orchestrator.processMessage(initialContext);
            
            // Save messages with context
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String conversationId,
            @RequestParam(required = false) String message,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Document upload from user: {} - file: {}", 
                userDetails.getFirebaseUid(), 
                file.getOriginalFilename());
        
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
            // Parse document
            DocumentParser.DocumentParseResult parseResult = documentParser.parseDocument(file);
            
            // Build context with document
            ChatRequest chatRequest = new ChatRequest();
            chatRequest.setMessage(message != null ? message : "Please analyze this document");
            chatRequest.setConversationId(conversationId);
            
            ConversationContext initialContext = contextService.buildContext(
                chatRequest,
                userDetails.getFirebaseUid()
            );
            
            // Add document metadata to context
            Map<String, Object> metadata = new HashMap<>(initialContext.getAgentMetadata());
            metadata.putAll(parseResult.toMetadata());
            
            ConversationContext contextWithDoc = initialContext.toBuilder()
                .agentMetadata(metadata)
                .build();
            
            // Process through agent chain
            ConversationContext finalContext = orchestrator.processMessage(contextWithDoc);
            
            // Save messages
            String uploadNotification = String.format("Document uploaded: %s (%s)", 
                    parseResult.getFileName(), 
                    parseResult.getFileType());
            contextService.saveMessage(finalContext, "user", uploadNotification);
            contextService.saveMessage(finalContext, "assistant", finalContext.getDiagnosisSummary());
            
            // Prepare response
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("analysis", finalContext.getDiagnosisSummary());
            responseData.put("fileName", parseResult.getFileName());
            responseData.put("fileType", parseResult.getFileType());
            responseData.put("conversationId", finalContext.getConversationId());
            responseData.put("confidence", finalContext.getConfidenceScore());
            
            return ResponseEntity.ok(ApiResponse.success(
                "Document analyzed successfully", 
                responseData
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