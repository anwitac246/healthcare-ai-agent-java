package com.aethercare.backend.chatbot.model.response;

import com.aethercare.backend.chatbot.model.dto.SafetyCheck;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ChatResponse {
    private String message;
    private String intent;
    private Double confidence;
    private List<String> suggestedQuestions;
    private boolean requiresHumanReview;
    private SafetyCheck safetyCheck;
    private String conversationId;
    private boolean reportGenerated;
    private String reportId;
}