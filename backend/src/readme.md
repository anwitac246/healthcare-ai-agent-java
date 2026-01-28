src/main/java/com/aethercare/backend/
├── chatbot/
│   ├── controller/
│   │   └── ChatbotController.java
│   ├── service/
│   │   ├── orchestrator/
│   │   │   ├── ChatOrchestrator.java
│   │   │   └── AgentChainBuilder.java
│   │   ├── agent/
│   │   │   ├── ChatAgent.java (interface)
│   │   │   ├── IntentDetectionAgent.java
│   │   │   ├── MedicalContextAgent.java
│   │   │   ├── DocumentAnalysisAgent.java
│   │   │   ├── DiagnosisAgent.java
│   │   │   ├── RiskAssessmentAgent.java
│   │   │   ├── ResponseSynthesisAgent.java
│   │   │   └── SafetyGuardAgent.java
│   │   └── context/
│   │       └── ConversationContextService.java
│   ├── model/
│   │   ├── request/
│   │   │   ├── ChatRequest.java
│   │   │   └── DocumentUploadRequest.java
│   │   ├── response/
│   │   │   ├── ChatResponse.java
│   │   │   └── DiagnosisResponse.java
│   │   ├── dto/
│   │   │   ├── ConversationContext.java
│   │   │   ├── AgentResult.java
│   │   │   ├── MedicalEntity.java
│   │   │   └── SafetyCheck.java
│   │   └── entity/
│   │       └── ChatMessage.java (MongoDB)
│   ├── integration/
│   │   ├── groq/
│   │   │   ├── GroqClient.java
│   │   │   └── GroqService.java
│   │   └── document/
│   │       ├── DocumentParser.java
│   │       └── TextExtractor.java
│   ├── repository/
│   │   └── ChatMessageRepository.java
│   └── config/
│       └── GroqConfig.java