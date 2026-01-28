package com.aethercare.backend.chatbot.model.response;

import com.aethercare.backend.chatbot.model.dto.MedicalEntity;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DiagnosisResponse {
    private String diagnosis;
    private Double confidence;
    private List<MedicalEntity> symptoms;
    private List<MedicalEntity> conditions;
    private List<String> recommendations;
    private List<String> riskFactors;
    private String medicalDisclaimer;
}