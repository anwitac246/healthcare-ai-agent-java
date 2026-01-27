package com.aethercare.backend.dashboard.model;

import java.util.List;

public record DoctorDashboardResponse(
    DoctorOverviewDTO doctorOverview,
    DashboardStats stats,
    List<AppointmentDTO> upcomingAppointments
) {}