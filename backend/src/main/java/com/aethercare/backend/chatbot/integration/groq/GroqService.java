package com.aethercare.backend.chatbot.integration.groq;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroqService {
    
    private final RestTemplate restTemplate;
    
    @Value("${groq.api.key}")
    private String apiKey;
    
    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;
    
    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;
    
    public String complete(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        
        Map<String, Object> requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.5,
            "max_tokens", 1500
        );
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                apiUrl,
                HttpMethod.POST,
                request,
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new RuntimeException("Empty response from Groq API");
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new RuntimeException("No choices in Groq API response");
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) {
                throw new RuntimeException("No message in Groq API response");
            }
            
            String content = (String) message.get("content");
            if (content == null || content.trim().isEmpty()) {
                throw new RuntimeException("Empty content in Groq API response");
            }
            
            return content;
            
        } catch (Exception e) {
            log.error("Groq API call failed", e);
            throw new RuntimeException("LLM completion failed: " + e.getMessage());
        }
    }
}
