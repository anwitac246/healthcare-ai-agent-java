package com.aethercare.backend.appointment.service;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.model.DoctorSchedule;
import com.aethercare.backend.appointment.model.dto.*;
import com.aethercare.backend.appointment.repository.AppointmentRepository;
import com.aethercare.backend.appointment.repository.DoctorScheduleRepository;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.model.UserRole;
import com.aethercare.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {
    
    private final AppointmentRepository appointmentRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final VideoConferenceService videoConferenceService;
    
    /**
     * Book a new appointment
     */
    @Transactional
    public AppointmentResponse bookAppointment(
        String patientFirebaseUid,
        BookAppointmentRequest request
    ) {
        // Validate patient
        User patient = userRepository.findByFirebaseUid(patientFirebaseUid)
            .orElseThrow(() -> new RuntimeException("Patient not found"));
        
        if (patient.getRole() != UserRole.PATIENT) {
            throw new RuntimeException("Only patients can book appointments");
        }
        
        // Validate doctor
        User doctor = userRepository.findById(request.doctorId())
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        if (doctor.getRole() != UserRole.DOCTOR) {
            throw new RuntimeException("Invalid doctor ID");
        }
        
        // Check if slot is available
        if (!isSlotAvailable(request.doctorId(), request.appointmentDateTime())) {
            throw new RuntimeException("Selected time slot is not available");
        }
        
        // Create appointment
        Appointment appointment = new Appointment();
        appointment.setPatientId(patient.getId());
        appointment.setDoctorId(doctor.getId());
        appointment.setPatientName(patient.getFirstName() + " " + patient.getLastName());
        appointment.setDoctorName("Dr. " + doctor.getFirstName() + " " + doctor.getLastName());
        appointment.setPatientEmail(patient.getEmail());
        appointment.setDoctorEmail(doctor.getEmail());
        appointment.setSpecialty(doctor.getSpecialization());
        appointment.setMode(request.mode());
        appointment.setAppointmentDateTime(request.appointmentDateTime());
        appointment.setNotes(request.notes());
        appointment.setStatus(Appointment.AppointmentStatus.SCHEDULED);
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment booked: {} for patient {} with doctor {}", 
            appointment.getId(), patient.getEmail(), doctor.getEmail());
        
        return mapToResponse(appointment);
    }
    
    /**
     * Get doctor's availability for a specific date
     */
    public DoctorAvailabilityResponse getDoctorAvailability(String doctorId, LocalDate date) {
        User doctor = userRepository.findById(doctorId)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        DoctorSchedule schedule = scheduleRepository
            .findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctorId, dayOfWeek)
            .orElse(null);
        
        if (schedule == null) {
            return new DoctorAvailabilityResponse(
                doctorId,
                "Dr. " + doctor.getFirstName() + " " + doctor.getLastName(),
                doctor.getSpecialization(),
                date,
                List.of()
            );
        }
        
        List<AvailableSlot> slots = generateAvailableSlots(doctorId, date, schedule);
        
        return new DoctorAvailabilityResponse(
            doctorId,
            "Dr. " + doctor.getFirstName() + " " + doctor.getLastName(),
            doctor.getSpecialization(),
            date,
            slots
        );
    }
    
    /**
     * Get all appointments for a patient
     */
    public List<AppointmentResponse> getPatientAppointments(String patientFirebaseUid) {
        User patient = userRepository.findByFirebaseUid(patientFirebaseUid)
            .orElseThrow(() -> new RuntimeException("Patient not found"));
        
        List<Appointment> appointments = appointmentRepository
            .findByPatientIdOrderByAppointmentDateTimeDesc(patient.getId());
        
        return appointments.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Get all appointments for a doctor
     */
    public List<AppointmentResponse> getDoctorAppointments(String doctorFirebaseUid) {
        User doctor = userRepository.findByFirebaseUid(doctorFirebaseUid)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdOrderByAppointmentDateTimeDesc(doctor.getId());
        
        return appointments.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Get appointment by ID with video link generation if needed
     */
    public AppointmentResponse getAppointmentById(String appointmentId, String userFirebaseUid) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        User user = userRepository.findByFirebaseUid(userFirebaseUid)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Verify user has access to this appointment
        if (!appointment.getPatientId().equals(user.getId()) && 
            !appointment.getDoctorId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to appointment");
        }
        
        // Generate video link if needed
        if (appointment.getMode() == Appointment.AppointmentMode.ONLINE &&
            appointment.getStatus() == Appointment.AppointmentStatus.SCHEDULED &&
            videoConferenceService.shouldGenerateLink(appointment.getAppointmentDateTime()) &&
            appointment.getVideoConferenceLink() == null) {
            
            generateVideoLink(appointment);
        }
        
        return mapToResponse(appointment);
    }
    
    /**
     * Approve an appointment (Doctor only)
     */
    @Transactional
    public AppointmentResponse approveAppointment(
        String appointmentId,
        String doctorFirebaseUid
    ) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        User doctor = userRepository.findByFirebaseUid(doctorFirebaseUid)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Verify doctor owns this appointment
        if (!appointment.getDoctorId().equals(doctor.getId())) {
            throw new RuntimeException("Unauthorized to approve this appointment");
        }
        
        if (appointment.getStatus() != Appointment.AppointmentStatus.PENDING) {
            throw new RuntimeException("Only pending appointments can be approved");
        }
        
        // Update appointment
        appointment.setStatus(Appointment.AppointmentStatus.SCHEDULED);
        appointment.setApprovedAt(Instant.now());
        appointment.setUpdatedAt(Instant.now());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} approved by doctor {}", appointmentId, doctor.getEmail());
        
        return mapToResponse(appointment);
    }
    
    /**
     * Reject an appointment (Doctor only)
     */
    @Transactional
    public AppointmentResponse rejectAppointment(
        String appointmentId,
        String doctorFirebaseUid,
        RejectAppointmentRequest request
    ) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        User doctor = userRepository.findByFirebaseUid(doctorFirebaseUid)
            .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        // Verify doctor owns this appointment
        if (!appointment.getDoctorId().equals(doctor.getId())) {
            throw new RuntimeException("Unauthorized to reject this appointment");
        }
        
        if (appointment.getStatus() != Appointment.AppointmentStatus.PENDING) {
            throw new RuntimeException("Only pending appointments can be rejected");
        }
        
        // Update appointment
        appointment.setStatus(Appointment.AppointmentStatus.REJECTED);
        appointment.setRejectionReason(request.reason());
        appointment.setRejectedAt(Instant.now());
        appointment.setUpdatedAt(Instant.now());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} rejected by doctor {}", appointmentId, doctor.getEmail());
        
        return mapToResponse(appointment);
    }
    
    /**
     * Cancel an appointment
     */
    @Transactional
    public AppointmentResponse cancelAppointment(
        String appointmentId,
        String userFirebaseUid,
        CancelAppointmentRequest request
    ) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        User user = userRepository.findByFirebaseUid(userFirebaseUid)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Verify user has permission to cancel
        if (!appointment.getPatientId().equals(user.getId()) && 
            !appointment.getDoctorId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to cancel this appointment");
        }
        
        if (appointment.getStatus() != Appointment.AppointmentStatus.SCHEDULED &&
            appointment.getStatus() != Appointment.AppointmentStatus.PENDING) {
            throw new RuntimeException("Only pending or scheduled appointments can be cancelled");
        }
        
        // Update appointment
        appointment.setStatus(Appointment.AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(request.reason());
        appointment.setCancelledBy(user.getEmail());
        appointment.setCancelledAt(Instant.now());
        appointment.setUpdatedAt(Instant.now());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} cancelled by {}", appointmentId, user.getEmail());
        
        return mapToResponse(appointment);
    }
    
    /**
     * Validate video conference link access
     */
    public boolean validateVideoLinkAccess(String appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        if (appointment.getVideoConferenceLink() == null) {
            return false;
        }
        
        if (appointment.getVideoLinkExpiresAt() == null) {
            return false;
        }
        
        return videoConferenceService.isLinkValid(appointment.getVideoLinkExpiresAt());
    }
    
    /**
     * Generate video conference link for appointment
     */
    @Transactional
    public void generateVideoLink(Appointment appointment) {
        if (appointment.getVideoConferenceLink() != null) {
            log.debug("Video link already exists for appointment {}", appointment.getId());
            return;
        }
        
        Instant now = Instant.now();
        String videoLink = videoConferenceService.generateMeetingLink(appointment.getId());
        Instant expiresAt = videoConferenceService.calculateExpiryTime(now);
        
        appointment.setVideoConferenceLink(videoLink);
        appointment.setVideoLinkGeneratedAt(now);
        appointment.setVideoLinkExpiresAt(expiresAt);
        appointment.setUpdatedAt(now);
        
        appointmentRepository.save(appointment);
        
        log.info("Video link generated for appointment {}: {}", 
            appointment.getId(), videoLink);
    }
    
    /**
     * Check if a time slot is available
     */
    private boolean isSlotAvailable(String doctorId, Instant appointmentTime) {
        Instant slotEnd = appointmentTime.plus(45, ChronoUnit.MINUTES);
        
        List<Appointment> existingAppointments = appointmentRepository
            .findDoctorAppointmentsInRange(doctorId, appointmentTime, slotEnd);
        
        return existingAppointments.isEmpty();
    }
    
    /**
     * Generate available time slots for a specific date
     */
    private List<AvailableSlot> generateAvailableSlots(
        String doctorId,
        LocalDate date,
        DoctorSchedule schedule
    ) {
        List<AvailableSlot> slots = new ArrayList<>();
        
        LocalTime currentTime = schedule.getStartTime();
        LocalTime endTime = schedule.getEndTime();
        
        ZoneId zoneId = ZoneId.systemDefault();
        
        while (currentTime.isBefore(endTime)) {
            LocalTime slotEndTime = currentTime.plusMinutes(schedule.getSlotDurationMinutes());
            
            if (slotEndTime.isAfter(endTime)) {
                break;
            }
            
            Instant slotStart = ZonedDateTime.of(date, currentTime, zoneId).toInstant();
            Instant slotEnd = ZonedDateTime.of(date, slotEndTime, zoneId).toInstant();
            
            // Check if slot is in the past
            if (slotStart.isBefore(Instant.now())) {
                currentTime = slotEndTime;
                continue;
            }
            
            // Check if slot is available
            boolean available = isSlotAvailable(doctorId, slotStart);
            
            slots.add(new AvailableSlot(slotStart, slotEnd, available));
            
            currentTime = slotEndTime;
        }
        
        return slots;
    }
    
    /**
     * Map Appointment entity to AppointmentResponse DTO
     */
    private AppointmentResponse mapToResponse(Appointment appointment) {
        boolean videoLinkAvailable = appointment.getVideoConferenceLink() != null &&
            videoConferenceService.isLinkValid(appointment.getVideoLinkExpiresAt());
        
        return new AppointmentResponse(
            appointment.getId(),
            appointment.getDoctorId(),
            appointment.getDoctorName(),
            appointment.getDoctorEmail(),
            appointment.getPatientId(),
            appointment.getPatientName(),
            appointment.getPatientEmail(),
            appointment.getSpecialty(),
            appointment.getMode(),
            appointment.getAppointmentDateTime(),
            appointment.getStatus(),
            videoLinkAvailable ? appointment.getVideoConferenceLink() : null,
            videoLinkAvailable,
            appointment.getVideoLinkExpiresAt(),
            appointment.getCancellationReason(),
            appointment.getCancelledBy(),
            appointment.getRejectionReason(),
            appointment.getRejectedAt(),
            appointment.getApprovedAt(),
            appointment.getNotes(),
            appointment.getDurationMinutes(),
            appointment.getCreatedAt()
        );
    }
}