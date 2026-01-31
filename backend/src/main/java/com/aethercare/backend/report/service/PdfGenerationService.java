package com.aethercare.backend.report.service;

import com.aethercare.backend.report.model.MedicalReport;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.text.pdf.draw.LineSeparator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class PdfGenerationService {
    
    private static final String PDF_DIRECTORY = "reports/pdfs";
    private static final Font TITLE_FONT = new Font(Font.FontFamily.HELVETICA, 24, Font.BOLD, BaseColor.BLACK);
    private static final Font HEADER_FONT = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD, new BaseColor(22, 101, 52));
    private static final Font NORMAL_FONT = new Font(Font.FontFamily.HELVETICA, 11, Font.NORMAL, BaseColor.BLACK);
    private static final Font SMALL_FONT = new Font(Font.FontFamily.HELVETICA, 9, Font.NORMAL, BaseColor.GRAY);
    
    public String generatePrescriptionPdf(MedicalReport report) throws Exception {
        Path pdfDir = Paths.get(PDF_DIRECTORY);
        if (!Files.exists(pdfDir)) {
            Files.createDirectories(pdfDir);
        }
        
        String fileName = "prescription_" + report.getId() + ".pdf";
        String filePath = Paths.get(PDF_DIRECTORY, fileName).toString();
        
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);
        PdfWriter.getInstance(document, new FileOutputStream(filePath));
        document.open();
        
        addHeader(document, report);
        addPatientInfo(document, report);
        addDiagnosisSection(document, report);
        addSymptomsSection(document, report);
        addMedicationsSection(document, report);
        addCareInstructionsSection(document, report);
        addFooter(document, report);
        
        document.close();
        log.info("Generated PDF prescription at: {}", filePath);
        
        return filePath;
    }
    
    private void addHeader(Document document, MedicalReport report) throws DocumentException {
        Paragraph title = new Paragraph("AETHERCARE", TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(10);
        document.add(title);
        
        Paragraph subtitle = new Paragraph("Medical Prescription", HEADER_FONT);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(20);
        document.add(subtitle);
        
        LineSeparator line = new LineSeparator();
        line.setLineColor(new BaseColor(22, 101, 52));
        document.add(new Chunk(line));
        
        document.add(new Paragraph(" "));
    }
    
    private void addPatientInfo(Document document, MedicalReport report) throws DocumentException {
        Paragraph sectionTitle = new Paragraph("Patient Information", HEADER_FONT);
        sectionTitle.setSpacingBefore(10);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
        
        document.add(new Paragraph("Name: " + report.getPatientName(), NORMAL_FONT));
        document.add(new Paragraph("Email: " + report.getPatientEmail(), NORMAL_FONT));
        if (report.getPatientPhone() != null) {
            document.add(new Paragraph("Phone: " + report.getPatientPhone(), NORMAL_FONT));
        }
        if (report.getPatientDob() != null) {
            document.add(new Paragraph("Date of Birth: " + report.getPatientDob(), NORMAL_FONT));
        }
        if (report.getPatientGender() != null) {
            document.add(new Paragraph("Gender: " + report.getPatientGender(), NORMAL_FONT));
        }
        
        document.add(new Paragraph(" "));
    }
    
    private void addDiagnosisSection(Document document, MedicalReport report) throws DocumentException {
        Paragraph sectionTitle = new Paragraph("Diagnosis", HEADER_FONT);
        sectionTitle.setSpacingBefore(10);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
        
        document.add(new Paragraph(report.getDiagnosis(), NORMAL_FONT));
        
        if (report.getConfidence() != null) {
            Paragraph confidence = new Paragraph(
                "Confidence Level: " + String.format("%.0f", report.getConfidence()) + "%", 
                SMALL_FONT
            );
            confidence.setSpacingBefore(5);
            document.add(confidence);
        }
        
        document.add(new Paragraph(" "));
    }
    
    private void addSymptomsSection(Document document, MedicalReport report) throws DocumentException {
        if (report.getSymptoms() == null || report.getSymptoms().isEmpty()) {
            return;
        }
        
        Paragraph sectionTitle = new Paragraph("Reported Symptoms", HEADER_FONT);
        sectionTitle.setSpacingBefore(10);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
        
        com.itextpdf.text.List symptomList = new com.itextpdf.text.List(com.itextpdf.text.List.UNORDERED);
        symptomList.setListSymbol("\u2022");
        symptomList.setIndentationLeft(20);
        
        for (String symptom : report.getSymptoms()) {
            symptomList.add(new ListItem(symptom, NORMAL_FONT));
        }
        
        document.add(symptomList);
        document.add(new Paragraph(" "));
    }
    
    private void addMedicationsSection(Document document, MedicalReport report) throws DocumentException {
        if (report.getMedications() == null || report.getMedications().isEmpty()) {
            return;
        }
        
        Paragraph sectionTitle = new Paragraph("Prescribed Medications", HEADER_FONT);
        sectionTitle.setSpacingBefore(10);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
        
        com.itextpdf.text.List medList = new com.itextpdf.text.List(com.itextpdf.text.List.ORDERED);
        medList.setIndentationLeft(20);
        
        for (String medication : report.getMedications()) {
            medList.add(new ListItem(medication, NORMAL_FONT));
        }
        
        document.add(medList);
        document.add(new Paragraph(" "));
    }
    
    private void addCareInstructionsSection(Document document, MedicalReport report) throws DocumentException {
        if (report.getCareInstructions() == null || report.getCareInstructions().isEmpty()) {
            return;
        }
        
        Paragraph sectionTitle = new Paragraph("Care Instructions", HEADER_FONT);
        sectionTitle.setSpacingBefore(10);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
        
        com.itextpdf.text.List careList = new com.itextpdf.text.List(com.itextpdf.text.List.UNORDERED);
        careList.setListSymbol("\u2713");
        careList.setIndentationLeft(20);
        
        for (String instruction : report.getCareInstructions()) {
            careList.add(new ListItem(instruction, NORMAL_FONT));
        }
        
        document.add(careList);
        document.add(new Paragraph(" "));
    }
    
    private void addFooter(Document document, MedicalReport report) throws DocumentException {
        document.add(new Paragraph(" "));
        document.add(new Paragraph(" "));
        
        LineSeparator line = new LineSeparator();
        line.setLineColor(BaseColor.LIGHT_GRAY);
        document.add(new Chunk(line));
        
        Paragraph disclaimer = new Paragraph(
            "DISCLAIMER: This is an AI-generated medical assessment and is NOT a substitute for professional medical advice, diagnosis, or treatment. " +
            "Always seek the advice of qualified healthcare providers with any questions regarding medical conditions.",
            SMALL_FONT
        );
        disclaimer.setAlignment(Element.ALIGN_JUSTIFIED);
        disclaimer.setSpacingBefore(10);
        document.add(disclaimer);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a")
            .withZone(ZoneId.systemDefault());
        String generatedTime = formatter.format(report.getGeneratedAt());
        
        Paragraph timestamp = new Paragraph("Generated on: " + generatedTime, SMALL_FONT);
        timestamp.setAlignment(Element.ALIGN_RIGHT);
        timestamp.setSpacingBefore(10);
        document.add(timestamp);
    }
}