package com.aethercare.backend.dashboard.model;

public record DashboardStats(
    int totalAppointmentsToday,
    int totalPatientsThisMonth,
    int upcomingAppointmentsCount
) {}