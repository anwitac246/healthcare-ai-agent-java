package com.aethercare.backend.appointment.service;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.model.Appointment.AppointmentMode;
import com.aethercare.backend.appointment.model.Appointment.AppointmentStatus;
import com.aethercare.backend.appointment.model.DoctorAvailability;
import com.aethercare.backend.appointment.model.dto.*;
import com.aethercare.backend.appointment.repository.AppointmentRepository;
import com.aethercare.backend.appointment.repository.DoctorAvailabilityRepository;
import com.aethercare.backend.user.model.User;
import com.aethercare.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {
    
    private final AppointmentRepository appointmentRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final JitsiService jitsiService;
    
    private static final int MAX_BOOKING_DAYS_AHEAD = 15;
    private static final int HOLD_DURATION_MINUTES = 1000;
    private static final int VIDEO_LINK_EARLY_ACCESS_MINUTES = 15;
    private static final int VIDEO_LINK_LATE_ACCESS_MINUTES = 45;
    
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest request, String patientId) {
        log.info("Booking appointment for patient: {} with doctor: {}", patientId, request.getDoctorId());
        
        // 1. Validate request
        validateBookingRequest(request);
        
        // 2. Fetch patient and doctor details
        User patient = userRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        
        User doctor = userRepository.findById(request.getDoctorId())
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        // 3. Check if slot is available
        validateSlotAvailability(request.getDoctorId(), request.getAppointmentDateTime(), request.getDurationMinutes());
        
        // 4. Create appointment with PENDING status
        Instant now = Instant.now();
        Instant holdExpiresAt = now.plus(HOLD_DURATION_MINUTES, ChronoUnit.MINUTES);
        
        String jitsiRoomName = request.getMode() == AppointmentMode.ONLINE 
            ? jitsiService.generateRoomName() 
            : null;
        
        Appointment appointment = Appointment.builder()
            .patientId(patientId)
            .doctorId(request.getDoctorId())
            .patientName(patient.getFirstName() + " " + patient.getLastName())
            .patientEmail(patient.getEmail())
            .doctorName(doctor.getFirstName() + " " + doctor.getLastName())
            .doctorSpecialization(doctor.getSpecialization())
            .appointmentDateTime(request.getAppointmentDateTime())
            .durationMinutes(request.getDurationMinutes())
            .status(AppointmentStatus.PENDING)
            .mode(request.getMode())
            .notes(request.getNotes())
            .jitsiRoomName(jitsiRoomName)
            .holdExpiresAt(holdExpiresAt)
            .createdAt(now)
            .updatedAt(now)
            .createdBy(patientId)
            .build();
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment created successfully: {}", appointment.getId());
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse approveAppointment(String appointmentId, String doctorId) {
        log.info("Doctor {} approving appointment {}", doctorId, appointmentId);
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        // Validate doctor authorization
        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new IllegalArgumentException("You are not authorized to approve this appointment");
        }
        
        // Validate appointment status
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalStateException("Only PENDING appointments can be approved");
        }
        
        // Check if hold has expired
        if (!appointment.isInHoldPeriod()) {
            appointment.setStatus(AppointmentStatus.EXPIRED);
            appointmentRepository.save(appointment);
            throw new IllegalStateException("Appointment hold has expired");
        }
        
        // Update to SCHEDULED and generate video link
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointment.setHoldExpiresAt(null); // Clear hold
        
        if (appointment.getMode() == AppointmentMode.ONLINE) {
            generateVideoLink(appointment);
        }
        
        appointment.setUpdatedAt(Instant.now());
        appointment.setLastModifiedBy(doctorId);
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} approved successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse rejectAppointment(String appointmentId, String doctorId, String reason) {
        log.info("Doctor {} rejecting appointment {}", doctorId, appointmentId);
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new IllegalArgumentException("You are not authorized to reject this appointment");
        }
        
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalStateException("Only PENDING appointments can be rejected");
        }
        
        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setDoctorRejectionReason(reason);
        appointment.setHoldExpiresAt(null);
        appointment.setUpdatedAt(Instant.now());
        appointment.setLastModifiedBy(doctorId);
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} rejected successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse cancelAppointment(String appointmentId, String patientId, String reason) {
        log.info("Patient {} cancelling appointment {}", patientId, appointmentId);
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        if (!appointment.getPatientId().equals(patientId)) {
            throw new IllegalArgumentException("You are not authorized to cancel this appointment");
        }
        
        if (appointment.getStatus() != AppointmentStatus.PENDING && 
            appointment.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new IllegalStateException("Only PENDING or SCHEDULED appointments can be cancelled");
        }
        
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setPatientCancellationReason(reason);
        appointment.setUpdatedAt(Instant.now());
        appointment.setLastModifiedBy(patientId);
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} cancelled successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    public List<AppointmentResponse> getPatientUpcomingAppointments(String patientId, int limit) {
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByPatientIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(patientId, now);
        
        return appointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.PENDING || a.getStatus() == AppointmentStatus.SCHEDULED)
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getPatientPastAppointments(String patientId, int limit) {
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByPatientIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(patientId, now);
        
        return appointments.stream()
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getDoctorUpcomingAppointments(String doctorId, int limit) {
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(doctorId, now);
        
        return appointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.PENDING || a.getStatus() == AppointmentStatus.SCHEDULED)
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getDoctorPastAppointments(String doctorId, int limit) {
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(doctorId, now);
        
        return appointments.stream()
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<TimeSlotDTO> getAvailableSlots(String doctorId, LocalDate date) {
        log.info("Fetching available slots for doctor {} on {}", doctorId, date);
        
        // Get doctor's availability
        DoctorAvailability availability = availabilityRepository.findByDoctorId(doctorId)
            .orElse(DoctorAvailability.createDefault(doctorId));
        
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        DoctorAvailability.TimeSlot workingHours = availability.getWeeklySchedule().get(dayOfWeek);
        
        if (workingHours == null || !workingHours.isAvailable()) {
            return Collections.emptyList();
        }
        
        // Generate time slots (every 45 minutes)
        List<TimeSlotDTO> slots = new ArrayList<>();
        LocalTime currentTime = workingHours.getStartTime();
        LocalTime endTime = workingHours.getEndTime();
        
        while (currentTime.plusMinutes(45).isBefore(endTime) || currentTime.plusMinutes(45).equals(endTime)) {
            LocalDateTime slotDateTime = LocalDateTime.of(date, currentTime);
            Instant slotInstant = slotDateTime.atZone(ZoneId.systemDefault()).toInstant();
            
            // Check if slot is available
            boolean isAvailable = isSlotAvailable(doctorId, slotInstant);
            
            slots.add(TimeSlotDTO.builder()
                .startTime(slotInstant)
                .endTime(slotInstant.plus(45, ChronoUnit.MINUTES))
                .isAvailable(isAvailable)
                .build());
            
            currentTime = currentTime.plusMinutes(45);
        }
        
        return slots;
    }
    
    private void validateBookingRequest(BookAppointmentRequest request) {
        Instant now = Instant.now();
        Instant appointmentTime = request.getAppointmentDateTime();
        
        // Check if appointment is in the past
        if (appointmentTime.isBefore(now)) {
            throw new IllegalArgumentException("Cannot book appointments in the past");
        }
        
        // Check if appointment is more than 15 days ahead
        Instant maxBookingDate = now.plus(MAX_BOOKING_DAYS_AHEAD, ChronoUnit.DAYS);
        if (appointmentTime.isAfter(maxBookingDate)) {
            throw new IllegalArgumentException("Cannot book appointments more than " + MAX_BOOKING_DAYS_AHEAD + " days in advance");
        }
        
        // Validate appointment is on valid time slot (must be on the hour or half-hour)
        ZonedDateTime zdt = appointmentTime.atZone(ZoneId.systemDefault());
        int minute = zdt.getMinute();
        if (minute != 0 && minute != 15 && minute != 30 && minute != 45) {
            throw new IllegalArgumentException("Appointments must start at :00, :15, :30, or :45 minutes");
        }
        
        // Check if it's within working hours
        LocalTime time = zdt.toLocalTime();
        DayOfWeek dayOfWeek = zdt.getDayOfWeek();
        
        if (dayOfWeek == DayOfWeek.SUNDAY) {
            if (time.isBefore(LocalTime.of(9, 0)) || time.isAfter(LocalTime.of(12, 0))) {
                throw new IllegalArgumentException("Sunday appointments are only available from 9 AM to 12 PM");
            }
        } else {
            if (time.isBefore(LocalTime.of(9, 0)) || time.isAfter(LocalTime.of(17, 0))) {
                throw new IllegalArgumentException("Appointments are only available from 9 AM to 5 PM on weekdays and Saturdays");
            }
        }
    }
    
    private void validateSlotAvailability(String doctorId, Instant appointmentTime, int durationMinutes) {
        List<AppointmentStatus> activeStatuses = List.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.SCHEDULED
        );
        
        // Check exact time slot
        Optional<Appointment> existingAppointment = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAndStatusIn(doctorId, appointmentTime, activeStatuses);
        
        if (existingAppointment.isPresent()) {
            throw new IllegalStateException("This time slot is already booked");
        }
        
        // Check for overlapping appointments
        Instant endTime = appointmentTime.plus(durationMinutes, ChronoUnit.MINUTES);
        List<Appointment> overlappingAppointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeBetweenAndStatusIn(
                doctorId,
                appointmentTime.minus(45, ChronoUnit.MINUTES),
                endTime,
                activeStatuses
            );
        
        if (!overlappingAppointments.isEmpty()) {
            throw new IllegalStateException("This time slot conflicts with another appointment");
        }
    }
    
    private boolean isSlotAvailable(String doctorId, Instant slotTime) {
        // Check if slot is in the past
        if (slotTime.isBefore(Instant.now())) {
            return false;
        }
        
        List<AppointmentStatus> activeStatuses = List.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.SCHEDULED
        );
        
        Optional<Appointment> existingAppointment = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAndStatusIn(doctorId, slotTime, activeStatuses);
        
        return existingAppointment.isEmpty();
    }
    
    private void generateVideoLink(Appointment appointment) {
        if (appointment.getJitsiRoomName() == null) {
            appointment.setJitsiRoomName(jitsiService.generateRoomName());
        }
        
        String videoLink = jitsiService.generateMeetingLink(appointment.getJitsiRoomName());
        appointment.setVideoConferenceLink(videoLink);
        
        // Link valid from T-15 minutes to T+45 minutes
        Instant meetingStart = appointment.getAppointmentDateTime();
        appointment.setVideoLinkValidFrom(meetingStart.minus(VIDEO_LINK_EARLY_ACCESS_MINUTES, ChronoUnit.MINUTES));
        appointment.setVideoLinkValidUntil(meetingStart.plus(VIDEO_LINK_LATE_ACCESS_MINUTES, ChronoUnit.MINUTES));
    }
    
    private AppointmentResponse mapToResponse(Appointment appointment) {
        boolean videoLinkAvailable = appointment.getMode() == AppointmentMode.ONLINE 
            && appointment.getStatus() == AppointmentStatus.SCHEDULED
            && appointment.isVideoLinkValid();
        
        return AppointmentResponse.builder()
            .id(appointment.getId())
            .patientId(appointment.getPatientId())
            .doctorId(appointment.getDoctorId())
            .patientName(appointment.getPatientName())
            .patientEmail(appointment.getPatientEmail())
            .doctorName(appointment.getDoctorName())
            .doctorSpecialization(appointment.getDoctorSpecialization())
            .appointmentDateTime(appointment.getAppointmentDateTime())
            .durationMinutes(appointment.getDurationMinutes())
            .status(appointment.getStatus())
            .mode(appointment.getMode())
            .notes(appointment.getNotes())
            .videoConferenceLink(videoLinkAvailable ? appointment.getVideoConferenceLink() : null)
            .videoLinkAvailable(videoLinkAvailable)
            .holdExpiresAt(appointment.getHoldExpiresAt())
            .createdAt(appointment.getCreatedAt())
            .cancellationReason(appointment.getPatientCancellationReason())
            .rejectionReason(appointment.getDoctorRejectionReason())
            .build();
    }
}