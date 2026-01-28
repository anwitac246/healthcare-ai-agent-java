package com.aethercare.backend.chatbot.integration.pubmed.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Request object for PubMed searches
 */
@Data
@Builder
public class PubMedSearchRequest {
    
    /**
     * Free-text symptoms or medical query
     */
    private String query;
    
    /**
     * List of individual symptoms (alternative to query)
     */
    private List<String> symptoms;
    
    /**
     * Maximum number of results to return (default: 10)
     */
    @Builder.Default
    private Integer maxResults = 10;
    
    /**
     * Filter to only recent articles (e.g., last 5 years)
     */
    private Integer yearsSincePublication;
    
    /**
     * Sort order: "relevance" or "date"
     */
    @Builder.Default
    private String sortBy = "relevance";
}