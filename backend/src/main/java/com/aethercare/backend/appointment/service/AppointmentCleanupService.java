package com.aethercare.backend.appointment.service;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.model.Appointment.AppointmentStatus;
import com.aethercare.backend.appointment.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentCleanupService {
    
    private final AppointmentRepository appointmentRepository;
    
    /**
     * Runs every 5 minutes to expire appointments with expired holds
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void expireOldHolds() {
        Instant now = Instant.now();
        List<Appointment> expiredHolds = appointmentRepository.findExpiredHolds(now);
        
        if (!expiredHolds.isEmpty()) {
            log.info("Expiring {} appointment holds", expiredHolds.size());
            
            for (Appointment appointment : expiredHolds) {
                appointment.setStatus(AppointmentStatus.EXPIRED);
                appointment.setUpdatedAt(now);
            }
            
            appointmentRepository.saveAll(expiredHolds);
        }
    }
}