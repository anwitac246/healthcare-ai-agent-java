package com.aethercare.backend.appointment.service;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentSchedulerService {
    
    private final AppointmentRepository appointmentRepository;
    private final VideoConferenceService videoConferenceService;
    
    /**
     * Runs every minute to generate video links for appointments starting in 5 minutes
     */
    @Scheduled(fixedDelay = 60000) // Run every 60 seconds
    @Transactional
    public void generateVideoLinks() {
        Instant now = Instant.now();
        Instant fiveMinutesFromNow = now.plus(5, ChronoUnit.MINUTES);
        Instant tenMinutesFromNow = now.plus(10, ChronoUnit.MINUTES);
        
        List<Appointment> appointmentsNeedingLink = appointmentRepository
            .findAppointmentsNeedingVideoLink(fiveMinutesFromNow, tenMinutesFromNow);
        
        if (!appointmentsNeedingLink.isEmpty()) {
            log.info("Generating video links for {} appointments", appointmentsNeedingLink.size());
            
            for (Appointment appointment : appointmentsNeedingLink) {
                try {
                    String videoLink = videoConferenceService.generateMeetingLink(appointment.getId());
                    Instant expiresAt = videoConferenceService.calculateExpiryTime(now);
                    
                    appointment.setVideoConferenceLink(videoLink);
                    appointment.setVideoLinkGeneratedAt(now);
                    appointment.setVideoLinkExpiresAt(expiresAt);
                    appointment.setUpdatedAt(now);
                    
                    appointmentRepository.save(appointment);
                    
                    log.info("Video link generated for appointment {}: {}", 
                        appointment.getId(), videoLink);
                    
                } catch (Exception e) {
                    log.error("Failed to generate video link for appointment {}", 
                        appointment.getId(), e);
                }
            }
        }
    }
    
    /**
     * Runs every minute to mark appointments with expired video links
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void handleExpiredVideoLinks() {
        Instant now = Instant.now();
        
        List<Appointment> expiredAppointments = appointmentRepository.findExpiredVideoLinks(now);
        
        if (!expiredAppointments.isEmpty()) {
            log.info("Handling {} appointments with expired video links", expiredAppointments.size());
            
            for (Appointment appointment : expiredAppointments) {
                try {
                    // Check if appointment actually happened
                    Instant appointmentEndTime = appointment.getAppointmentDateTime()
                        .plus(appointment.getDurationMinutes(), ChronoUnit.MINUTES);
                    
                    if (now.isAfter(appointmentEndTime)) {
                        appointment.setStatus(Appointment.AppointmentStatus.COMPLETED);
                        appointment.setUpdatedAt(now);
                        appointmentRepository.save(appointment);
                        
                        log.info("Marked appointment {} as COMPLETED", appointment.getId());
                    }
                    
                } catch (Exception e) {
                    log.error("Failed to update appointment {}", appointment.getId(), e);
                }
            }
        }
    }
    
    /**
     * Runs every hour to mark missed appointments as NO_SHOW
     */
    @Scheduled(fixedDelay = 3600000) // Run every hour
    @Transactional
    public void handleNoShowAppointments() {
        Instant now = Instant.now();
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);
        
        List<Appointment> missedAppointments = appointmentRepository
            .findDoctorAppointmentsInRange(null, oneHourAgo, now)
            .stream()
            .filter(apt -> apt.getStatus() == Appointment.AppointmentStatus.SCHEDULED)
            .filter(apt -> apt.getVideoConferenceLink() != null)
            .filter(apt -> apt.getVideoLinkExpiresAt() != null)
            .filter(apt -> now.isAfter(apt.getVideoLinkExpiresAt()))
            .toList();
        
        if (!missedAppointments.isEmpty()) {
            log.info("Marking {} appointments as NO_SHOW", missedAppointments.size());
            
            for (Appointment appointment : missedAppointments) {
                try {
                    appointment.setStatus(Appointment.AppointmentStatus.NO_SHOW);
                    appointment.setUpdatedAt(now);
                    appointmentRepository.save(appointment);
                    
                    log.info("Marked appointment {} as NO_SHOW", appointment.getId());
                    
                } catch (Exception e) {
                    log.error("Failed to update appointment {}", appointment.getId(), e);
                }
            }
        }
    }
}