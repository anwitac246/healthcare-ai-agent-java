package com.aethercare.backend.diagnosis.repository;

import com.aethercare.backend.diagnosis.model.Diagnosis;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagnosisRepository extends MongoRepository<Diagnosis, String> {
    List<Diagnosis> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}