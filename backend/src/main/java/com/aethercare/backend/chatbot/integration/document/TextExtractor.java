package com.aethercare.backend.chatbot.integration.document;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Slf4j
@Component
public class TextExtractor {
    
    public String extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        
        if (filename == null || filename.isEmpty()) {
            throw new IllegalArgumentException("File must have a name");
        }
        
        if (filename.toLowerCase().endsWith(".pdf")) {
            return extractFromPdf(file);
        } else if (filename.toLowerCase().endsWith(".txt")) {
            return new String(file.getBytes());
        }
        
        throw new UnsupportedOperationException("Unsupported file type: " + filename);
    }
    
    private String extractFromPdf(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            
            if (text == null || text.trim().isEmpty()) {
                throw new IOException("PDF appears to be empty or unreadable");
            }
            
            return text;
        } catch (IOException e) {
            log.error("Failed to extract text from PDF", e);
            throw new IOException("Could not read PDF file: " + e.getMessage());
        }
    }
}