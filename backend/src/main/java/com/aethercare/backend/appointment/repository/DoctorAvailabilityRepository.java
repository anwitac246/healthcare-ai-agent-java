package com.aethercare.backend.appointment.repository;

import com.aethercare.backend.appointment.model.DoctorAvailability;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DoctorAvailabilityRepository extends MongoRepository<DoctorAvailability, String> {
    Optional<DoctorAvailability> findByDoctorId(String doctorId);
}