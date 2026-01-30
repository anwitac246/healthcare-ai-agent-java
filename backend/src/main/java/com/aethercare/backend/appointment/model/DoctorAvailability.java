package com.aethercare.backend.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "doctor_availability")
public class DoctorAvailability {
    
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String doctorId;
    
    // Weekly schedule: Monday-Saturday 9-5, Sunday 9-12
    private Map<DayOfWeek, TimeSlot> weeklySchedule;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private boolean isAvailable;
    }
    
    /**
     * Creates default availability schedule:
     * Monday-Saturday: 9 AM - 5 PM
     * Sunday: 9 AM - 12 PM
     */
    public static DoctorAvailability createDefault(String doctorId) {
        Map<DayOfWeek, TimeSlot> schedule = new HashMap<>();
        
        // Monday to Saturday: 9 AM - 5 PM
        TimeSlot weekdaySlot = TimeSlot.builder()
            .startTime(LocalTime.of(9, 0))
            .endTime(LocalTime.of(17, 0))
            .isAvailable(true)
            .build();
        
        schedule.put(DayOfWeek.MONDAY, weekdaySlot);
        schedule.put(DayOfWeek.TUESDAY, weekdaySlot);
        schedule.put(DayOfWeek.WEDNESDAY, weekdaySlot);
        schedule.put(DayOfWeek.THURSDAY, weekdaySlot);
        schedule.put(DayOfWeek.FRIDAY, weekdaySlot);
        schedule.put(DayOfWeek.SATURDAY, weekdaySlot);
        
        // Sunday: 9 AM - 12 PM
        TimeSlot sundaySlot = TimeSlot.builder()
            .startTime(LocalTime.of(9, 0))
            .endTime(LocalTime.of(12, 0))
            .isAvailable(true)
            .build();
        
        schedule.put(DayOfWeek.SUNDAY, sundaySlot);
        
        return DoctorAvailability.builder()
            .doctorId(doctorId)
            .weeklySchedule(schedule)
            .build();
    }
}