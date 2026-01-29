package com.aethercare.backend.chatbot.integration.document;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentParser {
    
    private final TextExtractor textExtractor;
    
    /**
     * Parse document and return both text and metadata
     */
    public DocumentParseResult parseDocument(MultipartFile file) throws IOException {
        log.info("Parsing document: {} ({})", 
                file.getOriginalFilename(), 
                file.getContentType());
        
        String extractedText = textExtractor.extractText(file);
        
        if (extractedText == null || extractedText.trim().isEmpty()) {
            throw new IOException("No text could be extracted from document");
        }
        
        String fileType = textExtractor.getFileType(file);
        
        return DocumentParseResult.builder()
                .text(extractedText)
                .fileName(file.getOriginalFilename())
                .fileType(fileType)
                .fileSizeBytes(file.getSize())
                .build();
    }
    
    /**
     * Result of document parsing
     */
    @lombok.Data
    @lombok.Builder
    @lombok.Getter
    public static class DocumentParseResult {
        private String text;
        private String fileName;
        private String fileType;
        private long fileSizeBytes;
        
        public Map<String, Object> toMetadata() {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("documentText", text);
            metadata.put("fileName", fileName);
            metadata.put("documentType", fileType);
            metadata.put("fileSize", fileSizeBytes);
            return metadata;
        }
    }
}