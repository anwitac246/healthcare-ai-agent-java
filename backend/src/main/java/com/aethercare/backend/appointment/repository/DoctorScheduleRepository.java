package com.aethercare.backend.appointment.repository;

import com.aethercare.backend.appointment.model.DoctorSchedule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorScheduleRepository extends MongoRepository<DoctorSchedule, String> {
    
    List<DoctorSchedule> findByDoctorIdAndIsActiveTrue(String doctorId);
    
    Optional<DoctorSchedule> findByDoctorIdAndDayOfWeekAndIsActiveTrue(
        String doctorId, 
        DayOfWeek dayOfWeek
    );
    
    boolean existsByDoctorIdAndDayOfWeek(String doctorId, DayOfWeek dayOfWeek);
}