# AetherCare

A production-grade healthcare AI platform that provides intelligent symptom analysis, medical document insights, and conversational support through an agentic AI workflow.

## Overview

AetherCare combines modern healthcare technology with AI-powered analysis to deliver contextual medical insights. Built with enterprise-grade architecture, the platform offers secure authentication, evidence-based medical literature integration, and intelligent conversational assistance.

## Key Features

- **Secure Authentication** - Firebase-based authentication with role-based access control for patients and doctors
- **AI Medical Chatbot** - Conversational agent with intelligent workflow for symptom analysis and follow-up
- **Document Analysis** - Upload and analyze medical documents with AI-powered insights
- **Evidence-Based Research** - Integrated PubMed API for accessing peer-reviewed medical literature
- **Persistent Storage** - MongoDB-backed data persistence for users, conversations, and analysis metadata
- **Modern UI/UX** - Clean, intuitive dashboard with clear visual hierarchy

## Tech Stack

### Backend

![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=spring-security&logoColor=white)

**Core Dependencies:**
- Spring Boot Starter Web (REST APIs)
- Spring Boot Starter WebFlux (External API integration)
- Spring Boot Starter Data MongoDB
- Spring Boot Starter Validation
- Firebase Admin SDK
- Lombok
- Reactor Core

### Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Design System:**
- White background with green color scheme
- Clean layouts with strong visual boundaries
- Responsive and accessible interface

### External Integrations

- **Groq API** - LLM inference for medical reasoning
- **PubMed (NCBI)** - Medical literature search and retrieval
- **Firebase Authentication** - Identity and access management

## Architecture

```
┌─────────────┐
│   Frontend  │
│ React/Next  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Spring Boot Backend   │
├─────────────────────────┤
│ Controllers (REST)      │
│ Services (Logic)        │
│ Integrations (External) │
│ Repositories (Data)     │
│ Security Filters        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │
│   Atlas     │
└─────────────┘
```

### Backend Package Structure

```
com.aethercare.backend
├── auth
│   ├── controller
│   ├── service
│   ├── model
│   └── security
├── chatbot
│   ├── controller
│   ├── service
│   ├── agent
│   ├── integration
│   │   ├── groq
│   │   └── pubmed
│   └── model
├── user
│   ├── model
│   ├── repository
│   └── service
├── common
│   ├── response
│   └── exception
├── config
└── BackendApplication.java
```

## Getting Started

### Prerequisites

- Java 21 or higher
- Maven 3.6+
- MongoDB Atlas account
- Firebase project with Admin SDK
- Groq API key

### Environment Configuration

Create a `.env` file or set the following environment variables:

```bash
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-admin.json

GROQ_API_KEY=your_groq_api_key
```

### Running the Backend

Navigate to the backend directory and run:

```bash
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`

## Design Principles

- **Clean Architecture** - Explicit separation of concerns with layered design
- **Strong Typing** - Clear DTO boundaries and type safety
- **Secure by Default** - Production-grade security and error handling
- **Scalable** - Built to evolve into a full clinical decision-support system
- **Maintainable** - Readable code over clever abstractions

## Project Status

AetherCare is under active development. The platform is designed with scalability and maintainability as core principles, providing a solid foundation for a comprehensive clinical decision-support system.

## License

This project is currently private and not licensed for redistribution.

## Contact

For questions or collaboration opportunities, please open an issue in this repository.