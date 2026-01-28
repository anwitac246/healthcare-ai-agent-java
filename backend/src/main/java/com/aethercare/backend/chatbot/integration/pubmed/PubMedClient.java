package com.aethercare.backend.chatbot.integration.pubmed;

import com.aethercare.backend.chatbot.integration.pubmed.dto.PubMedArticle;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;


import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Low-level client for NCBI PubMed E-utilities API.
 * 
 * Uses two endpoints:
 * 1. ESearch: Search for articles and get PMIDs
 * 2. EFetch: Fetch full article details by PMID
 * 
 * API Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */
@Slf4j
@Component
public class PubMedClient {
    
    private final WebClient webClient;
    
    @Value("${pubmed.api.base-url:https://eutils.ncbi.nlm.nih.gov/entrez/eutils}")
    private String baseUrl;
    
    @Value("${pubmed.api.email:support@aethercare.com}")
    private String email;
    
    @Value("${pubmed.api.tool:AetherCare}")
    private String tool;
    
    @Value("${pubmed.api.timeout-seconds:30}")
    private Integer timeoutSeconds;
    
    public PubMedClient() {
        this.webClient = WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();
    }
    
    /**
     * Search PubMed and return list of PMIDs
     */
    public List<String> searchPubMed(String query, int maxResults) {
        log.info("Searching PubMed with query: {}", query);
        
        String url = baseUrl + "/esearch.fcgi" +
            "?db=pubmed" +
            "&term=" + encodeQuery(query) +
            "&retmax=" + maxResults +
            "&retmode=xml" +
            "&email=" + email +
            "&tool=" + tool;
        
        try {
            String response = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
            
            return extractPMIDs(response);
            
        } catch (WebClientResponseException e) {
            log.error("PubMed search failed with status {}: {}", e.getStatusCode(), e.getMessage());
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("PubMed search failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * Fetch article details by PMID list
     */
    public List<PubMedArticle> fetchArticles(List<String> pmids) {
        if (pmids == null || pmids.isEmpty()) {
            return new ArrayList<>();
        }
        
        log.info("Fetching {} articles from PubMed", pmids.size());
        
        String pmidList = String.join(",", pmids);
        
        String url = baseUrl + "/efetch.fcgi" +
            "?db=pubmed" +
            "&id=" + pmidList +
            "&retmode=xml" +
            "&email=" + email +
            "&tool=" + tool;
        
        try {
            String response = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
            
            return parseArticles(response);
            
        } catch (WebClientResponseException e) {
            log.error("PubMed fetch failed with status {}: {}", e.getStatusCode(), e.getMessage());
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("PubMed fetch failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * Extract PMIDs from ESearch XML response
     */
    private List<String> extractPMIDs(String xml) {
        List<String> pmids = new ArrayList<>();
        
        Pattern pattern = Pattern.compile("<Id>(\\d+)</Id>");
        Matcher matcher = pattern.matcher(xml);
        
        while (matcher.find()) {
            pmids.add(matcher.group(1));
        }
        
        log.debug("Extracted {} PMIDs", pmids.size());
        return pmids;
    }
    
    /**
     * Parse articles from EFetch XML response
     * 
     * This is a simplified parser. For production, consider using a proper XML parser
     * or library like JAXB for robust XML handling.
     */
    private List<PubMedArticle> parseArticles(String xml) {
        List<PubMedArticle> articles = new ArrayList<>();
        
        // Split by article boundary
        String[] articleBlocks = xml.split("<PubmedArticle>");
        
        for (String block : articleBlocks) {
            if (block.contains("</PubmedArticle>")) {
                articles.add(parseArticle(block));
            }
        }
        
        log.debug("Parsed {} articles", articles.size());
        return articles;
    }
    
    /**
     * Parse a single article from XML block
     */
    private PubMedArticle parseArticle(String xml) {
        return PubMedArticle.builder()
            .pmid(extractTag(xml, "PMID"))
            .title(extractTag(xml, "ArticleTitle"))
            .abstractText(extractAbstract(xml))
            .journal(extractTag(xml, "Title"))  // Journal title
            .publicationYear(extractYear(xml))
            .authors(extractAuthors(xml))
            .doi(extractDOI(xml))
            .relevanceScore(0.0)  // Will be calculated by service layer
            .build();
    }
    
    /**
     * Extract text between XML tags
     */
    private String extractTag(String xml, String tagName) {
        Pattern pattern = Pattern.compile("<" + tagName + ">(.*?)</" + tagName + ">", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(xml);
        
        if (matcher.find()) {
            return cleanXmlText(matcher.group(1));
        }
        
        return null;
    }
    
    /**
     * Extract abstract text (may have multiple sections)
     */
    private String extractAbstract(String xml) {
        StringBuilder abstractText = new StringBuilder();
        
        Pattern pattern = Pattern.compile("<AbstractText[^>]*>(.*?)</AbstractText>", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(xml);
        
        while (matcher.find()) {
            if (abstractText.length() > 0) {
                abstractText.append(" ");
            }
            abstractText.append(cleanXmlText(matcher.group(1)));
        }
        
        return abstractText.length() > 0 ? abstractText.toString() : null;
    }
    
    /**
     * Extract publication year
     */
    private Integer extractYear(String xml) {
        String year = extractTag(xml, "Year");
        if (year != null) {
            try {
                return Integer.parseInt(year);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
    
    /**
     * Extract authors (simplified - just last names)
     */
    private String extractAuthors(String xml) {
        List<String> authors = new ArrayList<>();
        
        Pattern pattern = Pattern.compile("<LastName>(.*?)</LastName>");
        Matcher matcher = pattern.matcher(xml);
        
        while (matcher.find() && authors.size() < 5) {  // Limit to first 5 authors
            authors.add(cleanXmlText(matcher.group(1)));
        }
        
        if (authors.isEmpty()) {
            return null;
        }
        
        String authorList = String.join(", ", authors);
        if (matcher.find()) {
            authorList += ", et al.";
        }
        
        return authorList;
    }
    
    /**
     * Extract DOI
     */
    private String extractDOI(String xml) {
        Pattern pattern = Pattern.compile("<ArticleId IdType=\"doi\">(.*?)</ArticleId>");
        Matcher matcher = pattern.matcher(xml);
        
        if (matcher.find()) {
            return cleanXmlText(matcher.group(1));
        }
        
        return null;
    }
    
    /**
     * Clean XML text (remove HTML entities, trim, etc.)
     */
    private String cleanXmlText(String text) {
        if (text == null) {
            return null;
        }
        
        return text
            .replaceAll("<[^>]+>", "")  // Remove any remaining tags
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("&amp;", "&")
            .replaceAll("&quot;", "\"")
            .replaceAll("\\s+", " ")
            .trim();
    }
    
    /**
     * URL encode query
     */
    private String encodeQuery(String query) {
        try {
            return java.net.URLEncoder.encode(query, "UTF-8");
        } catch (Exception e) {
            log.warn("Failed to encode query, using as-is");
            return query;
        }
    }
}