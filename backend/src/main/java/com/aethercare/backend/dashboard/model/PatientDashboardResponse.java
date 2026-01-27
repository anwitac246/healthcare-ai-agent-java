package com.aethercare.backend.dashboard.model;

import java.util.List;

public record PatientDashboardResponse(
    UserOverviewDTO userOverview,
    List<RecentDiagnosisDTO> recentDiagnoses,
    List<AppointmentDTO> upcomingAppointments
) {}