package com.aethercare.backend.dashboard.model;

public record RecentDiagnosisDTO(
    String id,          // Changed from Long to String
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