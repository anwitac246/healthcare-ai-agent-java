package com.aethercare.backend.chatbot.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MedicalEntity {
    private String type;
    private String value;
    private Double confidence;
    private String severity;
    private String source;
}