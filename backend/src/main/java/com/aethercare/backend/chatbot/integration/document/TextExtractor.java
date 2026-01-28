package com.aethercare.backend.chatbot.integration.document;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;

@Slf4j
@Component
public class TextExtractor {
    
    public String extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        
        if (filename == null || filename.isEmpty()) {
            throw new IllegalArgumentException("File must have a name");
        }
        
        String lowerFilename = filename.toLowerCase();
        
        if (lowerFilename.endsWith(".pdf")) {
            return extractFromPdf(file);
        } else if (lowerFilename.endsWith(".txt")) {
            return new String(file.getBytes());
        } else if (isImageFile(lowerFilename)) {
            return extractFromImage(file);
        }
        
        throw new UnsupportedOperationException("Unsupported file type: " + filename);
    }
    
    private boolean isImageFile(String filename) {
        return filename.endsWith(".png") || 
               filename.endsWith(".jpg") || 
               filename.endsWith(".jpeg") ||
               filename.endsWith(".gif") ||
               filename.endsWith(".bmp");
    }
    
    private String extractFromPdf(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            
            if (text == null || text.trim().isEmpty()) {
                throw new IOException("PDF appears to be empty or contains only images");
            }
            
            return text;
        } catch (IOException e) {
            log.error("Failed to extract text from PDF", e);
            throw new IOException("Could not read PDF file: " + e.getMessage());
        }
    }
    
    /**
     * Extract information from images
     * 
     * Note: For production, you should integrate a proper OCR library like:
     * - Tesseract OCR (via tess4j)
     * - Google Cloud Vision API
     * - AWS Textract
     * 
     * This implementation returns metadata for now.
     */
    private String extractFromImage(MultipartFile file) throws IOException {
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            
            if (image == null) {
                throw new IOException("Could not read image file");
            }
            
            int width = image.getWidth();
            int height = image.getHeight();
            
            // For now, return image metadata
            // In production, integrate OCR here
            String metadata = String.format(
                "Medical image uploaded: %s\n" +
                "Image dimensions: %dx%d pixels\n" +
                "Type: %s\n\n" +
                "Note: Image analysis requires OCR integration. " +
                "Please describe what's visible in the image for better analysis.",
                file.getOriginalFilename(),
                width,
                height,
                file.getContentType()
            );
            
            log.info("Image file processed: {}x{} pixels", width, height);
            return metadata;
            
        } catch (IOException e) {
            log.error("Failed to process image file", e);
            throw new IOException("Could not read image file: " + e.getMessage());
        }
    }
    
    /**
     * Get file type description
     */
    public String getFileType(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            return "unknown";
        }
        
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) return "PDF Document";
        if (lower.endsWith(".txt")) return "Text Document";
        if (lower.endsWith(".png")) return "PNG Image";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPEG Image";
        if (lower.endsWith(".gif")) return "GIF Image";
        if (lower.endsWith(".bmp")) return "BMP Image";
        
        return "Unknown";
    }
}