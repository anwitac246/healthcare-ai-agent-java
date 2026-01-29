package com.aethercare.backend.appointment.repository;

import com.aethercare.backend.appointment.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    
    // Patient queries
    List<Appointment> findByPatientIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
        String patientId, 
        Instant now, 
        Appointment.AppointmentStatus status
    );
    
    List<Appointment> findByPatientIdAndStatusOrderByAppointmentDateTimeDesc(
        String patientId,
        Appointment.AppointmentStatus status
    );
    
    List<Appointment> findByPatientIdOrderByAppointmentDateTimeDesc(String patientId);
    
    // Doctor queries
    List<Appointment> findByDoctorIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
        String doctorId, 
        Instant now, 
        Appointment.AppointmentStatus status
    );
    
    List<Appointment> findByDoctorIdAndStatusOrderByAppointmentDateTimeDesc(
        String doctorId,
        Appointment.AppointmentStatus status
    );
    
    List<Appointment> findByDoctorIdOrderByAppointmentDateTimeDesc(String doctorId);
    
    // Availability check
    @Query("{ 'doctorId': ?0, 'appointmentDateTime': { $gte: ?1, $lt: ?2 }, 'status': { $in: ['SCHEDULED', 'IN_PROGRESS'] } }")
    List<Appointment> findDoctorAppointmentsInRange(String doctorId, Instant start, Instant end);
    
    // Statistics
    long countByDoctorIdAndAppointmentDateTimeBetweenAndStatus(
        String doctorId,
        Instant start,
        Instant end,
        Appointment.AppointmentStatus status
    );
    
    // Video link expiry cleanup
    @Query("{ 'videoLinkExpiresAt': { $lt: ?0 }, 'status': 'IN_PROGRESS' }")
    List<Appointment> findExpiredVideoLinks(Instant now);
    
    // Upcoming appointments for video link generation
    @Query("{ 'appointmentDateTime': { $gte: ?0, $lte: ?1 }, 'status': 'SCHEDULED', 'mode': 'ONLINE', 'videoConferenceLink': null }")
    List<Appointment> findAppointmentsNeedingVideoLink(Instant from, Instant to);
    
    Optional<Appointment> findByIdAndStatus(String id, Appointment.AppointmentStatus status);
}