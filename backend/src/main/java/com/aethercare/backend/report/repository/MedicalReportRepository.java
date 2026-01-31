package com.aethercare.backend.report.repository;

import com.aethercare.backend.report.model.MedicalReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalReportRepository extends MongoRepository<MedicalReport, String> {
    List<MedicalReport> findByUserIdOrderByGeneratedAtDesc(String userId, Pageable pageable);
    List<MedicalReport> findByConversationId(String conversationId);
}