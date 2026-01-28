package com.aethercare.backend.chatbot.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.chatbot.integration.document.DocumentParser;
import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.entity.Conversation;
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
import java.util.*;

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
        log.info("Chat request from user: {} - message: {}", 
                userDetails.getFirebaseUid(), 
                request.getMessage());
        
        try {
            // Build context with chat history
            ConversationContext initialContext = contextService.buildContext(
                request,
                userDetails.getFirebaseUid()
            );
            
            log.debug("Processing message for conversation: {}", initialContext.getConversationId());
            
            // Process through agent chain
            ConversationContext finalContext = orchestrator.processMessage(initialContext);
            
            // Ensure we have a valid response
            String responseMessage = finalContext.getDiagnosisSummary();
            if (responseMessage == null || responseMessage.trim().isEmpty()) {
                responseMessage = "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.";
            }
            
            // Save messages with context
            contextService.saveMessage(finalContext, "user", request.getMessage());
            contextService.saveMessage(finalContext, "assistant", responseMessage);
            
            log.info("Generated response for conversation: {} with confidence: {}", 
                    finalContext.getConversationId(), 
                    finalContext.getConfidenceScore());
            
            ChatResponse response = ChatResponse.builder()
                .message(responseMessage)
                .confidence(finalContext.getConfidenceScore() != null ? finalContext.getConfidenceScore() : 0.0)
                .intent(finalContext.getDetectedIntent())
                .requiresHumanReview(finalContext.isRequiresHumanReview())
                .safetyCheck(finalContext.getSafetyCheck())
                .conversationId(finalContext.getConversationId())
                .suggestedQuestions(Collections.emptyList())
                .build();
            
            return ResponseEntity.ok(ApiResponse.success("Response generated successfully", response));
            
        } catch (Exception e) {
            log.error("Chat processing failed", e);
            
            // Return a proper error response
            ChatResponse errorResponse = ChatResponse.builder()
                .message("I apologize, but I encountered an error processing your request. Please try again.")
                .confidence(0.0)
                .conversationId(request.getConversationId())
                .build();
            
            return ResponseEntity.status(500).body(
                ApiResponse.success("Error: " + e.getMessage(), errorResponse)
            );
        }
    }
    
    @PostMapping("/upload-document")
    public ResponseEntity<ApiResponse<String>> uploadDocument(
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
            
            log.info("Document parsed successfully: {} ({})", 
                    parseResult.getFileName(), 
                    parseResult.getFileType());
            
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
            
            String analysis = finalContext.getDiagnosisSummary();
            if (analysis == null || analysis.trim().isEmpty()) {
                analysis = String.format("Document uploaded: %s\n\nI've received your document. Please describe any symptoms or questions you have about it.", 
                        parseResult.getFileName());
            }
            
            // Save messages
            String uploadNotification = String.format("Uploaded document: %s (%s)", 
                    parseResult.getFileName(), 
                    parseResult.getFileType());
            contextService.saveMessage(finalContext, "user", uploadNotification);
            contextService.saveMessage(finalContext, "assistant", analysis);
            
            log.info("Document analysis completed for conversation: {}", finalContext.getConversationId());
            
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
    
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConversations(
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Fetching conversations for user: {}", userDetails.getFirebaseUid());
        
        try {
            List<Conversation> conversations = contextService.getUserConversations(
                    userDetails.getFirebaseUid(), 
                    50
            );
            
            List<Map<String, Object>> conversationList = new ArrayList<>();
            for (Conversation conv : conversations) {
                Map<String, Object> convMap = new HashMap<>();
                convMap.put("id", conv.getId());
                convMap.put("title", conv.getTitle());
                convMap.put("lastMessage", conv.getLastMessage());
                convMap.put("timestamp", conv.getUpdatedAt().toString());
                conversationList.add(convMap);
            }
            
            return ResponseEntity.ok(ApiResponse.success(conversationList));
            
        } catch (Exception e) {
            log.error("Failed to fetch conversations", e);
            return ResponseEntity.status(500).body(
                ApiResponse.success("Failed to fetch conversations: " + e.getMessage(), null)
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
            var history = contextService.getConversationHistory(conversationId, 100);
            return ResponseEntity.ok(ApiResponse.success(history));
        } catch (Exception e) {
            log.error("Failed to fetch conversation history", e);
            return ResponseEntity.status(500).body(
                ApiResponse.success("Failed to fetch history: " + e.getMessage(), null)
            );
        }
    }
}