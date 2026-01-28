package com.aethercare.backend.dashboard.model;

public record RecentDiagnosisDTO(
    String id,          
    String query,
    DiagnosisStatus status,
    String timestamp
) {
    public enum DiagnosisStatus {
        COMPLETED,
        FAILED,
        PROCESSING
    }
}