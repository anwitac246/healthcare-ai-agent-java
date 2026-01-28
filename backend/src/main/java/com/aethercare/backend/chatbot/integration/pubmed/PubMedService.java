package com.aethercare.backend.chatbot.integration.pubmed;

import com.aethercare.backend.chatbot.integration.pubmed.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * High-level service for PubMed medical research queries.
 * 
 * This service:
 * - Accepts medical symptoms as input
 * - Constructs appropriate PubMed queries
 * - Retrieves relevant research articles
 * - Returns structured, actionable results
 * 
 * Designed for integration into diagnosis workflows.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PubMedService {
    
    private final PubMedClient pubMedClient;
    private final PubMedQueryBuilder queryBuilder;
    
    /**
     * Search PubMed using a free-text symptom description
     */
    public PubMedSearchResponse searchBySymptoms(String symptoms) {
        return searchBySymptoms(symptoms, 10, null);
    }
    
    /**
     * Search PubMed with custom parameters
     */
    public PubMedSearchResponse searchBySymptoms(String symptoms, int maxResults, Integer yearsSince) {
        log.info("Searching PubMed for symptoms: {}", symptoms);
        
        try {
            // Build query
            String query = queryBuilder.buildQuery(symptoms);
            
            if (query.isEmpty()) {
                return PubMedSearchResponse.builder()
                    .success(false)
                    .errorMessage("Invalid or empty symptoms provided")
                    .articles(new ArrayList<>())
                    .totalResults(0)
                    .build();
            }
            
            // Add date filter if specified
            if (yearsSince != null && yearsSince > 0) {
                query = queryBuilder.buildQueryWithDateFilter(query, yearsSince);
            }
            
            // Execute search
            return executeSearch(query, maxResults);
            
        } catch (Exception e) {
            log.error("PubMed search failed: {}", e.getMessage(), e);
            return PubMedSearchResponse.builder()
                    .success(false)
                    .errorMessage("Search failed: " + e.getMessage())
                    .articles(new ArrayList<>())
                    .totalResults(0)
                    .build();
        }
    }
    
    /**
     * Search PubMed using structured request
     */
    public PubMedSearchResponse search(PubMedSearchRequest request) {
        log.info("Processing PubMed search request");
        
        String query;
        if (request.getSymptoms() != null && !request.getSymptoms().isEmpty()) {
            query = queryBuilder.buildQuery(request.getSymptoms());
        } else if (request.getQuery() != null && !request.getQuery().isEmpty()) {
            query = queryBuilder.buildQuery(request.getQuery());
        } else {
            return PubMedSearchResponse.builder()
                    .success(false)
                    .errorMessage("No query or symptoms provided")
                    .articles(new ArrayList<>())
                    .totalResults(0)
                    .build();
        }
        
        // Add date filter
        if (request.getYearsSincePublication() != null) {
            query = queryBuilder.buildQueryWithDateFilter(query, request.getYearsSincePublication());
        }
        
        // Execute search
        return executeSearch(query, request.getMaxResults());
    }
    
    /**
     * Execute the actual search and fetch
     */
    private PubMedSearchResponse executeSearch(String query, int maxResults) {
        log.debug("Executing PubMed query: {}", query);
        
        // Step 1: Get PMIDs
        List<String> pmids = pubMedClient.searchPubMed(query, maxResults);
        
        if (pmids.isEmpty()) {
            log.warn("No articles found for query: {}", query);
            return PubMedSearchResponse.builder()
                    .success(true)
                    .searchQuery(query)
                    .articles(new ArrayList<>())
                    .totalResults(0)
                    .build();
        }
        
        // Step 2: Fetch article details
        List<PubMedArticle> articles = pubMedClient.fetchArticles(pmids);
        
        // Step 3: Calculate relevance scores
        articles = calculateRelevanceScores(articles, query);
        
        return PubMedSearchResponse.builder()
                .success(true)
                .searchQuery(query)
                .articles(articles)
                .totalResults(articles.size())
                .build();
    }
    
    /**
     * Calculate relevance scores based on query terms
     * 
     * Simple scoring: count how many query terms appear in title + abstract
     */
    private List<PubMedArticle> calculateRelevanceScores(List<PubMedArticle> articles, String query) {
        String[] queryTerms = query.toLowerCase()
            .replaceAll("[^a-z0-9\\s]", "")
            .split("\\s+");
        
        for (PubMedArticle article : articles) {
            int matchCount = 0;
            String searchText = (article.getTitle() + " " + 
                               (article.getAbstractText() != null ? article.getAbstractText() : ""))
                               .toLowerCase();
            
            for (String term : queryTerms) {
                if (term.length() > 3 && searchText.contains(term)) {
                    matchCount++;
                }
            }
            
            // Normalize to 0-1 scale
            double score = Math.min(1.0, (double) matchCount / Math.max(1, queryTerms.length));
            article.setRelevanceScore(score);
        }
        
        // Sort by relevance (highest first)
        articles.sort((a, b) -> Double.compare(
            b.getRelevanceScore() != null ? b.getRelevanceScore() : 0.0,
            a.getRelevanceScore() != null ? a.getRelevanceScore() : 0.0
        ));
        
        return articles;
    }
    
    /**
     * Get article by PMID
     */
    public PubMedArticle getArticle(String pmid) {
        log.info("Fetching article with PMID: {}", pmid);
        
        List<PubMedArticle> articles = pubMedClient.fetchArticles(List.of(pmid));
        
        return articles.isEmpty() ? null : articles.get(0);
    }
    
    /**
     * Build a summary from search results suitable for diagnosis context
     */
    public String buildResearchSummary(PubMedSearchResponse response) {
        if (!response.isSuccess() || response.getArticles().isEmpty()) {
            return "No relevant medical research found for the provided symptoms.";
        }
        
        StringBuilder summary = new StringBuilder();
        summary.append("Based on ").append(response.getTotalResults())
               .append(" relevant medical research articles:\n\n");
        
        // Include top 3 most relevant articles
        int count = Math.min(3, response.getArticles().size());
        for (int i = 0; i < count; i++) {
            PubMedArticle article = response.getArticles().get(i);
            
            summary.append("**Study ").append(i + 1).append("**: ")
                   .append(article.getTitle()).append("\n");
            
            if (article.getJournal() != null && article.getPublicationYear() != null) {
                summary.append("*").append(article.getJournal())
                       .append(", ").append(article.getPublicationYear()).append("*\n");
            }
            
            if (article.getAbstractText() != null) {
                String truncatedAbstract = article.getAbstractText().length() > 200
                        ? article.getAbstractText().substring(0, 200) + "..."
                        : article.getAbstractText();
                summary.append(truncatedAbstract).append("\n");
            }
            
            summary.append("[PMID: ").append(article.getPmid()).append("]\n\n");
        }
        
        return summary.toString();
    }
}