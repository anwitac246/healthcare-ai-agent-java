package com.aethercare.backend.appointment.repository;

import com.aethercare.backend.appointment.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByPatientIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
        String patientId, 
        Instant now, 
        Appointment.AppointmentStatus status
    );
    
    List<Appointment> findByDoctorIdAndAppointmentDateTimeAfterAndStatusOrderByAppointmentDateTimeAsc(
        String doctorId, 
        Instant now, 
        Appointment.AppointmentStatus status
    );
    
    long countByDoctorIdAndAppointmentDateTimeBetweenAndStatus(
        String doctorId,
        Instant start,
        Instant end,
        Appointment.AppointmentStatus status
    );
}