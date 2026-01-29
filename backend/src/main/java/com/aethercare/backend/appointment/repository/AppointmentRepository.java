package com.aethercare.backend.appointment.repository;

import com.aethercare.backend.appointment.model.Appointment;
import com.aethercare.backend.appointment.model.Appointment.AppointmentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    
    // Patient queries
    List<Appointment> findByPatientIdAndStatusInOrderByAppointmentDateTimeDesc(
        String patientId, 
        List<AppointmentStatus> statuses, 
        Pageable pageable
    );
    
    List<Appointment> findByPatientIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(
        String patientId,
        Instant afterDate
    );
    
    List<Appointment> findByPatientIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(
        String patientId,
        Instant beforeDate
    );
    
    // Doctor queries
    List<Appointment> findByDoctorIdAndStatusInOrderByAppointmentDateTimeAsc(
        String doctorId,
        List<AppointmentStatus> statuses,
        Pageable pageable
    );
    
    List<Appointment> findByDoctorIdAndAppointmentDateTimeAfterOrderByAppointmentDateTimeAsc(
        String doctorId,
        Instant afterDate
    );
    
    List<Appointment> findByDoctorIdAndAppointmentDateTimeBeforeOrderByAppointmentDateTimeDesc(
        String doctorId,
        Instant beforeDate
    );
    
    // Slot availability check
    Optional<Appointment> findByDoctorIdAndAppointmentDateTimeAndStatusIn(
        String doctorId,
        Instant appointmentDateTime,
        List<AppointmentStatus> statuses
    );
    
    // Find appointments in time range
    List<Appointment> findByDoctorIdAndAppointmentDateTimeBetweenAndStatusIn(
        String doctorId,
        Instant startTime,
        Instant endTime,
        List<AppointmentStatus> statuses
    );
    
    // Expired holds cleanup
    @Query("{ 'status': 'PENDING', 'holdExpiresAt': { $lt: ?0 } }")
    List<Appointment> findExpiredHolds(Instant now);
}