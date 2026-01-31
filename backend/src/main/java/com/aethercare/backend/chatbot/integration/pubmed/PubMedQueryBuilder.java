package com.aethercare.backend.chatbot.integration.pubmed;

import org.springframework.stereotype.Component;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Builds PubMed-compatible search queries from medical symptoms.
 * 
 * FIXED: Removed overly restrictive filters that were blocking results
 */
@Component
public class PubMedQueryBuilder {
    
    private static final List<String> STOP_WORDS = Arrays.asList(
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "have", "has", "had", "i", "my", "me", "been", "very", "really"
    );
    
    /**
     * Build PubMed query from free-text symptoms
     * FIXED: Simple query without overly restrictive filters
     */
    public String buildQuery(String symptoms) {
        if (symptoms == null || symptoms.trim().isEmpty()) {
            return "";
        }
        
        // Sanitize and tokenize
        String cleaned = sanitizeInput(symptoms);
        List<String> tokens = tokenize(cleaned);
        
        // Remove stop words
        List<String> meaningfulTokens = tokens.stream()
            .filter(token -> !STOP_WORDS.contains(token.toLowerCase()))
            .collect(Collectors.toList());
        
        if (meaningfulTokens.isEmpty()) {
            return "";
        }
        
        // Simple query - just join symptoms
        // Don't add restrictive filters that block results
        return String.join(" ", meaningfulTokens);
    }
    
    /**
     * Build PubMed query from structured symptom list
     */
    public String buildQuery(List<String> symptoms) {
        if (symptoms == null || symptoms.isEmpty()) {
            return "";
        }
        
        List<String> cleanedSymptoms = symptoms.stream()
            .map(this::sanitizeInput)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
        
        if (cleanedSymptoms.isEmpty()) {
            return "";
        }
        
        // Simple query - just join symptoms
        return String.join(" ", cleanedSymptoms);
    }
    
    /**
     * Build query with date filter
     */
    public String buildQueryWithDateFilter(String query, Integer yearsSince) {
        if (yearsSince == null || yearsSince <= 0) {
            return query;
        }
        
        int currentYear = java.time.Year.now().getValue();
        int startYear = currentYear - yearsSince;
        
        // Add date filter
        return query + " AND " + startYear + ":" + currentYear + "[pdat]";
    }
    
    /**
     * Sanitize input to prevent injection and clean data
     */
    private String sanitizeInput(String input) {
        if (input == null) {
            return "";
        }
        
        // Remove special characters that could break queries
        String cleaned = input
            .replaceAll("[<>\\[\\]\\{\\}\\|\\\\]", "")
            .replaceAll("\\s+", " ")
            .trim();
        
        return cleaned;
    }
    
    /**
     * Tokenize input into individual terms
     */
    private List<String> tokenize(String input) {
        return Arrays.stream(input.split("[\\s,;]+"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
    }
    
    /**
     * DEPRECATED: This method was adding overly restrictive filters
     * Add medical context to query - ONLY use if specifically requested
     */
    public String addMedicalContext(String query) {
        // Don't add restrictive filters by default
        return query;
    }
}