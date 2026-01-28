package com.aethercare.backend.chatbot.integration.document;

import com.aethercare.backend.chatbot.integration.groq.GroqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentParser {
    
    private final TextExtractor textExtractor;
    private final GroqService groqService;
    
    public String parseDocument(MultipartFile file) throws IOException {
        log.info("Parsing document: {}", file.getOriginalFilename());
        
        String extractedText = textExtractor.extractText(file);
        
        if (extractedText == null || extractedText.trim().isEmpty()) {
            throw new IOException("No text could be extracted from document");
        }
        
        return analyzeExtractedText(extractedText);
    }
    
    public String analyzeDocument(String documentId) {
        return "Document analysis placeholder for ID: " + documentId;
    }
    
    private String analyzeExtractedText(String text) {
        String prompt = String.format("""
            Analyze the following medical document and extract:
            1. Patient symptoms
            2. Existing conditions
            3. Test results
            4. Medications
            5. Doctor's observations
            
            Keep the summary under 500 words.
            
            Document text:
            %s
            
            Provide a structured summary.
            """, text.substring(0, Math.min(text.length(), 3000)));
        
        try {
            return groqService.complete(prompt);
        } catch (Exception e) {
            log.error("Document analysis failed", e);
            return "Unable to analyze document. Please try again or consult with a healthcare provider.";
        }
    }
}
