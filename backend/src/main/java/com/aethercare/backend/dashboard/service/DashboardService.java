package com.aethercare.backend.dashboard.service;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.repository.AppointmentRepository;
import com.aethercare.backend.dashboard.model.*;
import com.aethercare.backend.diagnosis.model.Diagnosis;
import com.aethercare.backend.diagnosis.repository.DiagnosisRepository;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    
    private final UserRepository userRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final AppointmentRepository appointmentRepository;
    
    public DashboardService(
            UserRepository userRepository,
            DiagnosisRepository diagnosisRepository,
            AppointmentRepository appointmentRepository
    ) {
        this.userRepository = userRepository;
        this.diagnosisRepository = diagnosisRepository;
        this.appointmentRepository = appointmentRepository;
    }
    
    public PatientDashboardResponse getPatientDashboard(String firebaseUid) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // User Overview
        UserOverviewDTO userOverview = new UserOverviewDTO(
            user.getFirstName() + " " + user.getLastName(),
            user.getEmail(),
            user.getCreatedAt().toString()
        );
        
        // Recent Diagnoses (last 5)
        List<Diagnosis> recentDiagnoses = diagnosisRepository.findByUserIdOrderByCreatedAtDesc(
            user.getId(),
            PageRequest.of(0, 5)
        );
        
        List<RecentDiagnosisDTO> diagnosisDTOs = recentDiagnoses.stream()
            .map(d -> new RecentDiagnosisDTO(
                d.getId(),
                d.getQuery(),
                mapDiagnosisStatus(d.getStatus()),
                d.getCreatedAt().toString()
            ))
            .collect(Collectors.toList());
        
        // Upcoming Appointments
        List<Appointment> upcomingAppointments = appointmentRepository
            .findByPatientIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
                user.getId(),
                Instant.now(),
                Appointment.AppointmentStatus.SCHEDULED
            );
        
        List<AppointmentDTO> appointmentDTOs = upcomingAppointments.stream()
            .map(a -> new AppointmentDTO(
                a.getId(),
                a.getDoctorName(),
                mapAppointmentMode(a.getMode()),
                a.getAppointmentDateTime().toString(),
                a.getSpecialty()
            ))
            .collect(Collectors.toList());
        
        return new PatientDashboardResponse(userOverview, diagnosisDTOs, appointmentDTOs);
    }
    
    public DoctorDashboardResponse getDoctorDashboard(String firebaseUid) {
        User doctor = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Doctor Overview
        DoctorOverviewDTO doctorOverview = new DoctorOverviewDTO(
            "Dr. " + doctor.getFirstName() + " " + doctor.getLastName(),
            doctor.getEmail(),
            doctor.getSpecialization(),
            doctor.getClinicLocation(),
            doctor.getYearsOfExperience(),
            doctor.getCreatedAt().toString()
        );
        
        // Calculate stats
        Instant now = Instant.now();
        Instant startOfToday = LocalDate.now()
            .atStartOfDay(ZoneId.systemDefault())
            .toInstant();
        Instant endOfToday = startOfToday.plus(1, ChronoUnit.DAYS);
        
        Instant startOfMonth = LocalDate.now()
            .withDayOfMonth(1)
            .atStartOfDay(ZoneId.systemDefault())
            .toInstant();
        
        int appointmentsToday = (int) appointmentRepository
            .countByDoctorIdAndAppointmentDateTimeBetweenAndStatus(
                doctor.getId(),
                startOfToday,
                endOfToday,
                Appointment.AppointmentStatus.SCHEDULED
            );
        
        // Get upcoming appointments
        List<Appointment> upcomingAppointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
                doctor.getId(),
                now,
                Appointment.AppointmentStatus.SCHEDULED
            );
        
        DashboardStats stats = new DashboardStats(
            appointmentsToday,
            0, // This would require patient tracking
            upcomingAppointments.size()
        );
        
        List<AppointmentDTO> appointmentDTOs = upcomingAppointments.stream()
            .limit(10) // Show only next 10 appointments
            .map(a -> new AppointmentDTO(
                a.getId(),
                a.getPatientName(),
                mapAppointmentMode(a.getMode()),
                a.getAppointmentDateTime().toString(),
                a.getSpecialty()
            ))
            .collect(Collectors.toList());
        
        return new DoctorDashboardResponse(doctorOverview, stats, appointmentDTOs);
    }
    
    private RecentDiagnosisDTO.DiagnosisStatus mapDiagnosisStatus(Diagnosis.DiagnosisStatus status) {
        return switch (status) {
            case COMPLETED -> RecentDiagnosisDTO.DiagnosisStatus.COMPLETED;
            case FAILED -> RecentDiagnosisDTO.DiagnosisStatus.FAILED;
            case PROCESSING -> RecentDiagnosisDTO.DiagnosisStatus.PROCESSING;
        };
    }
    
    private AppointmentDTO.AppointmentMode mapAppointmentMode(Appointment.AppointmentMode mode) {
        return switch (mode) {
            case ONLINE -> AppointmentDTO.AppointmentMode.ONLINE;
            case IN_PERSON -> AppointmentDTO.AppointmentMode.IN_PERSON;
        };
    }
}