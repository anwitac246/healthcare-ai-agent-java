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
    private static final int HOLD_DURATION_MINUTES = 30;
    private static final int VIDEO_LINK_EARLY_ACCESS_MINUTES = 15;
    private static final int VIDEO_LINK_LATE_ACCESS_MINUTES = 45;
    private static final int SLOT_DURATION_MINUTES = 45;
    
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest request, String firebaseUid) {
        log.info("Booking appointment for firebaseUid: {} with doctor: {}", firebaseUid, request.getDoctorId());
        
        // 1. Fetch patient by Firebase UID (not by MongoDB ID)
        User patient = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found. Please ensure you are registered."));
        
        log.info("Found patient: {} (ID: {})", patient.getEmail(), patient.getId());
        
        // 2. Validate request
        validateBookingRequest(request);
        
        // 3. Fetch doctor details
        User doctor = userRepository.findById(request.getDoctorId())
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        log.info("Found doctor: Dr. {} {}", doctor.getFirstName(), doctor.getLastName());
        
        // 4. Check if slot is available
        if (!isSlotAvailable(request.getDoctorId(), request.getAppointmentDateTime())) {
            log.error("Slot not available: doctor={}, time={}", request.getDoctorId(), request.getAppointmentDateTime());
            throw new IllegalStateException("This time slot is not available");
        }
        
        // 5. Create appointment with PENDING status
        Instant now = Instant.now();
        Instant holdExpiresAt = now.plus(HOLD_DURATION_MINUTES, ChronoUnit.MINUTES);
        
        String jitsiRoomName = request.getMode() == AppointmentMode.ONLINE 
            ? jitsiService.generateRoomName() 
            : null;
        
        Appointment appointment = Appointment.builder()
            .patientId(patient.getId()) // Use MongoDB ID, not Firebase UID
            .doctorId(request.getDoctorId())
            .patientName(patient.getFirstName() + " " + patient.getLastName())
            .patientEmail(patient.getEmail())
            .doctorName("Dr. " + doctor.getFirstName() + " " + doctor.getLastName())
            .doctorSpecialization(doctor.getSpecialization())
            .appointmentDateTime(request.getAppointmentDateTime())
            .durationMinutes(SLOT_DURATION_MINUTES)
            .status(AppointmentStatus.PENDING)
            .mode(request.getMode())
            .notes(request.getNotes())
            .jitsiRoomName(jitsiRoomName)
            .holdExpiresAt(holdExpiresAt)
            .createdAt(now)
            .updatedAt(now)
            .createdBy(patient.getId())
            .build();
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment created successfully: {} for patient: {}", appointment.getId(), patient.getEmail());
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse approveAppointment(String appointmentId, String firebaseUid) {
        log.info("FirebaseUid {} approving appointment {}", firebaseUid, appointmentId);
        
        // Get doctor's MongoDB ID from Firebase UID
        User doctor = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        // Validate doctor authorization
        if (!appointment.getDoctorId().equals(doctor.getId())) {
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
        appointment.setLastModifiedBy(doctor.getId());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} approved successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse rejectAppointment(String appointmentId, String firebaseUid, String reason) {
        log.info("FirebaseUid {} rejecting appointment {}", firebaseUid, appointmentId);
        
        // Get doctor's MongoDB ID from Firebase UID
        User doctor = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        if (!appointment.getDoctorId().equals(doctor.getId())) {
            throw new IllegalArgumentException("You are not authorized to reject this appointment");
        }
        
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalStateException("Only PENDING appointments can be rejected");
        }
        
        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setDoctorRejectionReason(reason);
        appointment.setHoldExpiresAt(null);
        appointment.setUpdatedAt(Instant.now());
        appointment.setLastModifiedBy(doctor.getId());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} rejected successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    @Transactional
    public AppointmentResponse cancelAppointment(String appointmentId, String firebaseUid, String reason) {
        log.info("FirebaseUid {} cancelling appointment {}", firebaseUid, appointmentId);
        
        // Get patient's MongoDB ID from Firebase UID
        User patient = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        
        if (!appointment.getPatientId().equals(patient.getId())) {
            throw new IllegalArgumentException("You are not authorized to cancel this appointment");
        }
        
        if (appointment.getStatus() != AppointmentStatus.PENDING && 
            appointment.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new IllegalStateException("Only PENDING or SCHEDULED appointments can be cancelled");
        }
        
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setPatientCancellationReason(reason);
        appointment.setUpdatedAt(Instant.now());
        appointment.setLastModifiedBy(patient.getId());
        
        appointment = appointmentRepository.save(appointment);
        
        log.info("Appointment {} cancelled successfully", appointmentId);
        
        return mapToResponse(appointment);
    }
    
    public List<AppointmentResponse> getPatientUpcomingAppointments(String firebaseUid, int limit) {
        // Get patient's MongoDB ID from Firebase UID
        User patient = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByPatientIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(patient.getId(), now);
        
        return appointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.PENDING || a.getStatus() == AppointmentStatus.SCHEDULED)
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getPatientPastAppointments(String firebaseUid, int limit) {
        // Get patient's MongoDB ID from Firebase UID
        User patient = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByPatientIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(patient.getId(), now);
        
        return appointments.stream()
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getDoctorUpcomingAppointments(String firebaseUid, int limit) {
        // Get doctor's MongoDB ID from Firebase UID
        User doctor = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(doctor.getId(), now);
        
        return appointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.PENDING || a.getStatus() == AppointmentStatus.SCHEDULED)
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<AppointmentResponse> getDoctorPastAppointments(String firebaseUid, int limit) {
        // Get doctor's MongoDB ID from Firebase UID
        User doctor = userRepository.findByFirebaseUid(firebaseUid)
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        
        Instant now = Instant.now();
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(doctor.getId(), now);
        
        return appointments.stream()
            .limit(limit)
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }
    
    public List<TimeSlotDTO> getAvailableSlots(String doctorId, LocalDate date) {
        log.info("Fetching available slots for doctor {} on {}", doctorId, date);
        
        // Get doctor's availability (use default schedule if not set)
        DoctorAvailability availability = availabilityRepository.findByDoctorId(doctorId)
            .orElse(DoctorAvailability.createDefault(doctorId));
        
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        DoctorAvailability.TimeSlot workingHours = availability.getWeeklySchedule().get(dayOfWeek);
        
        if (workingHours == null || !workingHours.isAvailable()) {
            log.info("Doctor {} not available on {}", doctorId, dayOfWeek);
            return Collections.emptyList();
        }
        
        // Generate time slots
        List<TimeSlotDTO> slots = new ArrayList<>();
        LocalTime currentTime = workingHours.getStartTime();
        LocalTime endTime = workingHours.getEndTime();
        
        log.info("Generating slots from {} to {} for {}", currentTime, endTime, date);
        
        while (currentTime.plusMinutes(SLOT_DURATION_MINUTES).isBefore(endTime) || 
               currentTime.plusMinutes(SLOT_DURATION_MINUTES).equals(endTime)) {
            
            LocalDateTime slotDateTime = LocalDateTime.of(date, currentTime);
            Instant slotInstant = slotDateTime.atZone(ZoneId.systemDefault()).toInstant();
            
            // Check if slot is in the past
            boolean isPast = slotInstant.isBefore(Instant.now());
            
            // Check if slot is available
            boolean isAvailable = !isPast && isSlotAvailable(doctorId, slotInstant);
            
            log.debug("Slot at {} - isPast: {}, isAvailable: {}", currentTime, isPast, isAvailable);
            
            slots.add(TimeSlotDTO.builder()
                .startTime(slotInstant)
                .endTime(slotInstant.plus(SLOT_DURATION_MINUTES, ChronoUnit.MINUTES))
                .isAvailable(isAvailable)
                .build());
            
            currentTime = currentTime.plusMinutes(SLOT_DURATION_MINUTES);
        }
        
        log.info("Generated {} slots, {} available", slots.size(), 
                 slots.stream().filter(TimeSlotDTO::isAvailable).count());
        
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
        
        // Validate appointment is on valid time slot (must be on 15-minute intervals)
        ZonedDateTime zdt = appointmentTime.atZone(ZoneId.systemDefault());
        int minute = zdt.getMinute();
        if (minute % 15 != 0) {
            throw new IllegalArgumentException("Appointments must start at 15-minute intervals (:00, :15, :30, :45)");
        }
        
        // Check if it's within working hours
        LocalTime time = zdt.toLocalTime();
        DayOfWeek dayOfWeek = zdt.getDayOfWeek();
        
        // Monday-Saturday: 9 AM - 5 PM
        // Sunday: 9 AM - 12 PM
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
    
    private boolean isSlotAvailable(String doctorId, Instant slotTime) {
        // Check if slot is in the past
        if (slotTime.isBefore(Instant.now())) {
            log.debug("Slot {} is in the past", slotTime);
            return false;
        }
        
        // Get all appointments for this doctor at this time with active statuses
        List<AppointmentStatus> activeStatuses = List.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.SCHEDULED
        );
        
        Optional<Appointment> existingAppointment = appointmentRepository
            .findByDoctorIdAndAppointmentDateTimeAndStatusIn(doctorId, slotTime, activeStatuses);
        
        if (existingAppointment.isPresent()) {
            Appointment apt = existingAppointment.get();
            
            // If PENDING, check if hold is still valid
            if (apt.getStatus() == AppointmentStatus.PENDING) {
                if (!apt.isInHoldPeriod()) {
                    // Hold expired, slot is available
                    log.info("Found expired hold for slot {}, marking as available", slotTime);
                    return true;
                }
            }
            
            // Slot is taken
            log.debug("Slot {} is taken by appointment {} (status: {})", slotTime, apt.getId(), apt.getStatus());
            return false;
        }
        
        // No conflicting appointments found
        log.debug("Slot {} is available", slotTime);
        return true;
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