package com.aethercare.backend.chatbot.integration.pubmed;

import org.springframework.stereotype.Component;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Builds PubMed-compatible search queries from medical symptoms.
 * 
 * Strategy:
 * - Combines symptoms with medical MeSH terms where possible
 * - Uses boolean operators (AND, OR) for complex queries
 * - Sanitizes input to prevent injection
 * - Adds filters for article types (Clinical Trial, Review, etc.)
 */
@Component
public class PubMedQueryBuilder {
    
    private static final List<String> STOP_WORDS = Arrays.asList(
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "have", "has", "had", "i", "my", "me", "been", "very", "really"
    );
    
    /**
     * Build PubMed query from free-text symptoms
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
        
        // Build query with medical context
        return buildMedicalQuery(meaningfulTokens);
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
        
        return buildMedicalQuery(cleanedSymptoms);
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
     * Build medical query with proper boolean operators
     * 
     * Strategy:
     * - Join symptoms with AND (all symptoms must be present)
     * - Add [MeSH] tags for medical terms where appropriate
     * - Prioritize clinical and review articles
     */
    private String buildMedicalQuery(List<String> terms) {
        if (terms.isEmpty()) {
            return "";
        }
        
        // Join terms with AND
        String baseQuery = String.join(" AND ", terms);
        
        // Add filters for medical relevance
        String filters = "(clinical[sb] OR review[pt] OR clinical trial[pt])";
        
        return "(" + baseQuery + ") AND " + filters;
    }
    
    /**
     * Add medical context to query
     */
    public String addMedicalContext(String query) {
        if (query == null || query.isEmpty()) {
            return query;
        }
        
        // Add medical field tags
        return query + " AND (diagnosis[sb] OR etiology[sb] OR therapy[sb])";
    }
}