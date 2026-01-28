package com.aethercare.backend.chatbot.integration.pubmed.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Represents a single PubMed article with essential metadata
 */
@Data
@Builder
public class PubMedArticle {
    
    /**
     * PubMed unique identifier
     */
    private String pmid;
    
    /**
     * Article title
     */
    private String title;
    
    /**
     * Article abstract (may be null for some articles)
     */
    private String abstractText;
    
    /**
     * Journal name
     */
    private String journal;
    
    /**
     * Publication year
     */
    private Integer publicationYear;
    
    /**
     * List of authors (comma-separated)
     */
    private String authors;
    
    /**
     * DOI (Digital Object Identifier) if available
     */
    private String doi;
    
    /**
     * Relevance score (0.0 to 1.0) based on search query
     */
    private Double relevanceScore;
}