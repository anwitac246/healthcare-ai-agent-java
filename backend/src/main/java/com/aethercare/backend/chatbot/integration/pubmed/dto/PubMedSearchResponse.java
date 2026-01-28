package com.aethercare.backend.chatbot.integration.pubmed.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Response object containing PubMed search results
 */
@Data
@Builder
public class PubMedSearchResponse {
    
    /**
     * List of articles retrieved
     */
    private List<PubMedArticle> articles;
    
    /**
     * Total number of articles found (may be greater than returned)
     */
    private Integer totalResults;
    
    /**
     * The search query used
     */
    private String searchQuery;
    
    /**
     * Whether the search was successful
     */
    private boolean success;
    
    /**
     * Error message if search failed
     */
    private String errorMessage;
}