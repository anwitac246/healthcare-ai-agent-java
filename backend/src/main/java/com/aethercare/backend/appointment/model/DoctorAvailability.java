// backend/src/main/java/com/aethercare/backend/appointment/model/DoctorAvailability.java
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
    
    // Default working hours: Monday-Saturday 9-5, Sunday 9-12
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
    
    public static DoctorAvailability createDefault(String doctorId) {
        Map<DayOfWeek, TimeSlot> schedule = Map.of(
            DayOfWeek.MONDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.TUESDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.WEDNESDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.THURSDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.FRIDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.SATURDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).isAvailable(true).build(),
            DayOfWeek.SUNDAY, TimeSlot.builder().startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(12, 0)).isAvailable(true).build()
        );
        
        return DoctorAvailability.builder()
            .doctorId(doctorId)
            .weeklySchedule(schedule)
            .build();
    }
}