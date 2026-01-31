package com.aethercare.backend.chatbot.controller;

import com.aethercare.backend.auth.security.FirebaseUserDetails;
import com.aethercare.backend.chatbot.integration.document.DocumentParser;
import com.aethercare.backend.chatbot.model.dto.ConversationContext;
import com.aethercare.backend.chatbot.model.dto.MedicalEntity;
import com.aethercare.backend.chatbot.model.entity.Conversation;
import com.aethercare.backend.chatbot.model.request.ChatRequest;
import com.aethercare.backend.chatbot.model.response.ChatResponse;
import com.aethercare.backend.chatbot.service.context.ConversationContextService;
import com.aethercare.backend.chatbot.service.orchestrator.ChatOrchestrator;
import com.aethercare.backend.common.response.ApiResponse;
import com.aethercare.backend.report.model.MedicalReport;
import com.aethercare.backend.report.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    
    private final ChatOrchestrator orchestrator;
    private final ConversationContextService contextService;
    private final DocumentParser documentParser;
    private final ReportService reportService;
    
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal FirebaseUserDetails userDetails
    ) {
        log.info("Chat request from user: {} - message: {}", 
                userDetails.getFirebaseUid(), 
                request.getMessage());
        
        try {
            ConversationContext initialContext = contextService.buildContext(
                request,
                userDetails.getFirebaseUid()
            );
            
            log.debug("Processing message for conversation: {}", initialContext.getConversationId());
            
            ConversationContext finalContext = orchestrator.processMessage(initialContext);
            
            String responseMessage = finalContext.getDiagnosisSummary();
            if (responseMessage == null || responseMessage.trim().isEmpty()) {
                responseMessage = "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.";
            }
            
            // Save user message
            contextService.saveMessage(finalContext, "user", request.getMessage(), null, null);
            
            // Generate report if conditions are met
            MedicalReport generatedReport = null;
            if (shouldGenerateReport(finalContext)) {
                try {
                    generatedReport = generateMedicalReport(finalContext, userDetails.getFirebaseUid());
                    log.info("Medical report generated successfully for conversation: {}", 
                            finalContext.getConversationId());
                    
                    // Append download link to response
                    responseMessage = appendReportDownloadLink(responseMessage, generatedReport.getId());
                } catch (Exception e) {
                    log.error("Failed to generate medical report", e);
                }
            }
            
            // Save assistant message WITH report info
            contextService.saveMessage(
                finalContext, 
                "assistant", 
                responseMessage,
                generatedReport != null,
                generatedReport != null ? generatedReport.getId() : null
            );
            
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
                .reportGenerated(generatedReport != null)
                .reportId(generatedReport != null ? generatedReport.getId() : null)
                .build();
            
            return ResponseEntity.ok(ApiResponse.success("Response generated successfully", response));
            
        } catch (Exception e) {
            log.error("Chat processing failed", e);
            
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
    
    private String appendReportDownloadLink(String originalMessage, String reportId) {
        StringBuilder enhanced = new StringBuilder(originalMessage);
        enhanced.append("\n\n---\n\n");
        enhanced.append("### 📄 Medical Report Generated\n\n");
        enhanced.append("A detailed medical report has been generated based on this consultation.\n\n");
        enhanced.append("**Report ID:** ").append(reportId).append("\n\n");
        enhanced.append("You can view and download this report from:\n");
        enhanced.append("- The **Reports** section in your patient dashboard\n");
        enhanced.append("- Use Report ID: `").append(reportId).append("`\n\n");
        enhanced.append("*This report includes diagnosis, symptoms, recommended medications, and care instructions.*");
        
        return enhanced.toString();
    }
    
    private boolean shouldGenerateReport(ConversationContext context) {
        // Must have confidence score
        if (context.getConfidenceScore() == null || context.getConfidenceScore() < 70.0) {
            log.debug("Report not generated: confidence too low ({})", context.getConfidenceScore());
            return false;
        }
        
        // Must not be emergency
        if (context.getSafetyCheck() != null && context.getSafetyCheck().isEmergency()) {
            log.debug("Report not generated: emergency situation detected");
            return false;
        }
        
        // Must have symptoms
        if (context.getExtractedSymptoms() == null || context.getExtractedSymptoms().isEmpty()) {
            log.debug("Report not generated: no symptoms extracted");
            return false;
        }
        
        // Must have diagnosis
        if (context.getDiagnosisSummary() == null || context.getDiagnosisSummary().isEmpty()) {
            log.debug("Report not generated: no diagnosis available");
            return false;
        }
        
        // Check if diagnosis contains actual medical content (not just error messages)
        String diagnosis = context.getDiagnosisSummary().toLowerCase();
        if (diagnosis.contains("i apologize") || diagnosis.contains("error") || 
            diagnosis.contains("couldn't generate") || diagnosis.length() < 100) {
            log.debug("Report not generated: diagnosis appears to be error message");
            return false;
        }
        
        log.info("Report generation criteria met - confidence: {}, symptoms: {}", 
                context.getConfidenceScore(), context.getExtractedSymptoms().size());
        return true;
    }
    
    private MedicalReport generateMedicalReport(ConversationContext context, String userId) {
        String diagnosis = extractDiagnosis(context.getDiagnosisSummary());
        
        List<String> symptoms = context.getExtractedSymptoms().stream()
            .map(MedicalEntity::getValue)
            .collect(Collectors.toList());
        
        List<String> medications = extractMedications(context.getDiagnosisSummary());
        List<String> careInstructions = extractCareInstructions(context.getDiagnosisSummary());
        
        log.info("Generating report with diagnosis: {}, {} symptoms, {} medications", 
                diagnosis, symptoms.size(), medications.size());
        
        return reportService.createReport(
            userId,
            context.getConversationId(),
            diagnosis,
            symptoms,
            medications,
            careInstructions,
            context.getConfidenceScore()
        );
    }
    
    private String extractDiagnosis(String response) {
        // Try multiple patterns to extract diagnosis
        Pattern[] patterns = {
            Pattern.compile("(?:Possible Conditions?|Diagnosis):\\s*\\*\\*(.+?)\\*\\*", Pattern.DOTALL),
            Pattern.compile("(?:Possible Conditions?|Diagnosis):\\s*(.+?)(?:\\n\\n|\\*\\*)", Pattern.DOTALL),
            Pattern.compile("(?:Possible Conditions?):\\s*[\\d\\.\\-]?\\s*(.+?)(?:\\n|$)")
        };
        
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(response);
            if (matcher.find()) {
                String diagnosis = matcher.group(1).trim();
                diagnosis = diagnosis.replaceAll("\\*\\*", "").trim();
                // Get first line if multiple
                diagnosis = diagnosis.split("\\n")[0].trim();
                if (!diagnosis.isEmpty() && diagnosis.length() > 5) {
                    return diagnosis;
                }
            }
        }
        
        // Fallback: look for first substantial sentence about a condition
        String[] lines = response.split("\\n");
        for (String line : lines) {
            if ((line.contains("condition") || line.contains("diagnosis") || 
                 line.contains("likely") || line.contains("suggest")) && 
                line.length() > 20 && !line.startsWith("#")) {
                return line.replaceAll("\\*\\*", "").trim();
            }
        }
        
        return "Medical assessment based on reported symptoms";
    }
    
    private List<String> extractMedications(String response) {
    List<String> medications = new ArrayList<>();
    
    log.debug("Extracting medications from response of length: {}", response.length());
    
    // PATTERN 1: Extract from bulleted/numbered medication lists
    // Matches: * Medication, - Medication, 1. Medication, • Medication
    Pattern bulletPattern = Pattern.compile(
        "(?:^|\\n)\\s*[*\\-•\\d+\\.)]+\\s*([A-Z][a-zA-Z]+(?:\\s+\\d+\\s*(?:mg|mcg|g|ml|units?))?[^\\n]*?)(?=\\n|$)",
        Pattern.MULTILINE
    );
    Matcher bulletMatcher = bulletPattern.matcher(response);
    
    while (bulletMatcher.find()) {
        String med = bulletMatcher.group(1).trim();
        // Filter out section headers and non-medication content
        if (!med.isEmpty() && 
            !med.toLowerCase().startsWith("medications:") &&
            !med.toLowerCase().startsWith("treatment:") &&
            !med.toLowerCase().startsWith("care") &&
            !med.toLowerCase().startsWith("recommendations:") &&
            !med.toLowerCase().contains("consult") &&
            med.length() > 3) {
            
            String cleaned = cleanMedication(med);
            if (!cleaned.isEmpty() && cleaned.length() > 3) {
                log.debug("Extracted medication from bullet: {}", cleaned);
                medications.add(cleaned);
            }
        }
    }
    
    // PATTERN 2: Extract from "Medications:" section more carefully
    Pattern sectionPattern = Pattern.compile(
        "Medications?:\\s*\\n(.*?)(?:\\n\\n|\\n[A-Z][a-z]+:|###|$)",
        Pattern.DOTALL | Pattern.CASE_INSENSITIVE
    );
    Matcher sectionMatcher = sectionPattern.matcher(response);
    
    if (sectionMatcher.find()) {
        String medSection = sectionMatcher.group(1);
        log.debug("Found medication section: {}", medSection.substring(0, Math.min(100, medSection.length())));
        
        // Split by newlines and process each line
        String[] lines = medSection.split("\\n");
        for (String line : lines) {
            line = line.trim();
            // Skip empty lines and lines that don't look like medications
            if (line.isEmpty() || line.length() < 5) continue;
            
            // Remove leading bullets/numbers
            String cleaned = line.replaceAll("^[*\\-•\\d+\\.)]+\\s*", "");
            cleaned = cleanMedication(cleaned);
            
            if (!cleaned.isEmpty() && 
                !cleaned.toLowerCase().startsWith("medications") &&
                !cleaned.toLowerCase().contains("consult") &&
                cleaned.length() > 3) {
                
                log.debug("Extracted medication from section: {}", cleaned);
                medications.add(cleaned);
            }
        }
    }
    
    // PATTERN 3: Extract from parenthetical examples like "(for pain and fever)"
    // Find medications mentioned with dosages
    Pattern dosagePattern = Pattern.compile(
        "([A-Z][a-zA-Z]+)\\s+(\\d+\\s*(?:mg|mcg|g|ml|units?))\\s+([^\\n\\.]{0,50})",
        Pattern.CASE_INSENSITIVE
    );
    Matcher dosageMatcher = dosagePattern.matcher(response);
    
    while (dosageMatcher.find() && medications.size() < 10) {
        String medName = dosageMatcher.group(1);
        String dosage = dosageMatcher.group(2);
        String instructions = dosageMatcher.group(3).trim();
        
        String fullMed = medName + " " + dosage;
        if (!instructions.isEmpty() && instructions.length() < 40) {
            fullMed += " " + instructions;
        }
        
        String cleaned = cleanMedication(fullMed);
        if (!cleaned.isEmpty()) {
            log.debug("Extracted medication with dosage: {}", cleaned);
            medications.add(cleaned);
        }
    }
    
    // Remove duplicates (case-insensitive)
    List<String> uniqueMeds = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    
    for (String med : medications) {
        String normalized = med.toLowerCase().split("\\s+")[0]; // First word (drug name)
        if (!seen.contains(normalized)) {
            seen.add(normalized);
            uniqueMeds.add(med);
        }
    }
    
    log.info("Extracted {} unique medications", uniqueMeds.size());
    
    // Fallback if nothing found
    if (uniqueMeds.isEmpty()) {
        log.warn("No medications extracted, using fallback");
        uniqueMeds.add("Consult with a healthcare provider for appropriate medication prescription");
    }
    
    return uniqueMeds;
}

private String cleanMedication(String medication) {
    if (medication == null) return "";
    
    // Remove markdown formatting
    String cleaned = medication
        .replaceAll("\\*\\*", "")
        .replaceAll("\\*", "")
        .replaceAll("#", "")
        .replaceAll("^[\\d\\.\\-]+\\s*", "") // Remove leading numbers/bullets
        .trim();
    
    // Remove common non-medication prefixes
    cleaned = cleaned.replaceAll("(?i)^(medications?:|treatment:|prescribed?:)\\s*", "");
    
    // Remove trailing periods if present
    cleaned = cleaned.replaceAll("\\.$", "");
    
    return cleaned.trim();
}
   
    
    private List<String> extractCareInstructions(String response) {
        List<String> instructions = new ArrayList<>();
        
        // Try to find care/recommendations section
        Pattern sectionPattern = Pattern.compile(
            "(?:Recommendations?|Care|Instructions?|Next Steps):\\s*(.+?)(?:\\n\\n|\\*\\*[A-Z]|###|$)", 
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE
        );
        Matcher sectionMatcher = sectionPattern.matcher(response);
        
        if (sectionMatcher.find()) {
            String careSection = sectionMatcher.group(1);
            
            // Extract items from lists
            Pattern itemPattern = Pattern.compile("(?:[-•\\d+\\.]|\\d+\\))\\s*(.+?)(?:\\n|$)");
            Matcher itemMatcher = itemPattern.matcher(careSection);
            
            while (itemMatcher.find()) {
                String instruction = itemMatcher.group(1).trim();
                if (!instruction.isEmpty() && !instruction.startsWith("*") && !instruction.startsWith("#")) {
                    instruction = instruction.replaceAll("\\*\\*", "").trim();
                    instructions.add(instruction);
                }
            }
        }
        
        // Default instructions if none found
        if (instructions.isEmpty()) {
            instructions.add("Monitor symptoms and seek medical attention if condition worsens");
            instructions.add("Maintain adequate rest and hydration");
            instructions.add("Follow up with healthcare provider for comprehensive evaluation");
            instructions.add("Keep track of symptom progression and any new symptoms");
        }
        
        return instructions;
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
            DocumentParser.DocumentParseResult parseResult = documentParser.parseDocument(file);
            
            log.info("Document parsed successfully: {} ({})", 
                    parseResult.getFileName(), 
                    parseResult.getFileType());
            
            ChatRequest chatRequest = new ChatRequest();
            chatRequest.setMessage(message != null ? message : "Please analyze this document");
            chatRequest.setConversationId(conversationId);
            
            ConversationContext initialContext = contextService.buildContext(
                chatRequest,
                userDetails.getFirebaseUid()
            );
            
            Map<String, Object> metadata = new HashMap<>(initialContext.getAgentMetadata());
            metadata.putAll(parseResult.toMetadata());
            
            ConversationContext contextWithDoc = initialContext.toBuilder()
                .agentMetadata(metadata)
                .build();
            
            ConversationContext finalContext = orchestrator.processMessage(contextWithDoc);
            
            String analysis = finalContext.getDiagnosisSummary();
            if (analysis == null || analysis.trim().isEmpty()) {
                analysis = String.format("Document uploaded: %s\n\nI've received your document. Please describe any symptoms or questions you have about it.", 
                        parseResult.getFileName());
            }
            
            String uploadNotification = String.format("Uploaded document: %s (%s)", 
                    parseResult.getFileName(), 
                    parseResult.getFileType());
            contextService.saveMessage(finalContext, "user", uploadNotification, null, null);
            contextService.saveMessage(finalContext, "assistant", analysis, null, null);
            
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