# AetherCare Backend — Setup Notes (For Future Reference)

This document records **everything done to set up the Java + Spring Boot backend**, step by step. Use this if you ever reinstall, switch machines, or forget why something exists.

---

## 1. Install Java 21 (LTS)

* Download **Java 21 LTS (Temurin)** from Adoptium:

  * [https://adoptium.net](https://adoptium.net)
* Choose:

  * Version: **21 (LTS)**
  * OS: Windows
  * Architecture: x64
* Install using the **MSI installer**
* Ensure during install:

  * `JAVA_HOME` is set
  * Java is added to `PATH`

### Verify installation

```bash
java --version
```

Expected output should mention `21.x`.

---

## 2. IDE Setup (VS Code)

* Using **VS Code** as the editor
* Installed required extensions:

  * **Extension Pack for Java** (Microsoft)
  * **Spring Boot Extension Pack** (VMware)
* Restarted VS Code after installing extensions

---

## 3. Create Spring Boot Project

Used **Spring Initializr** to generate the project.

### Configuration

* Project: **Maven**
* Language: **Java**
* Spring Boot version: **3.5.10** (stable)
* Java: **21**
* Group: `com.aethercare`
* Artifact: `backend`
* Packaging: `Jar`

### Initial Dependencies

* Spring Web
* (Spring Security added later)

---

## 4. Project Structure (Initial)

After generating and opening the project:

```
backend/
├── mvnw
├── mvnw.cmd
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/aethercare/backend/
    │   │   └── BackendApplication.java
    │   └── resources/
    │       └── application.yml
    └── test/
```

Key rule:

> **All Java code must live under the base package of `BackendApplication.java`.**

---

## 5. Running the Backend (Windows + PowerShell)

PowerShell does NOT allow running local scripts directly.

### Correct command

```powershell
.\mvnw.cmd spring-boot:run
```

### For building and downloading dependencies

```powershell
.\mvnw.cmd clean install
```

Expected successful output:

```
BUILD SUCCESS
```

---

## 6. Switching to YAML Configuration

* Deleted `application.properties`
* Created `application.yml`
* Spring Boot automatically picks it up

Rule:

> Do not mix `.properties` and `.yml`.

---

## 7. First Controller Test

Created a simple health endpoint to verify routing.

```java
@RestController
public class HealthController {

    @GetMapping("/health")
    public String health() {
        return "OK";
    }
}
```

Verified by opening:

```
http://localhost:8080/health
```

---

## 8. Exception Handling Setup

### Created common exception structure

```
com.aethercare.backend.common.exception
```

### UnauthorizedException

* Extends `RuntimeException`
* Represents authentication/authorization failures

### GlobalExceptionHandler

* Uses `@RestControllerAdvice`
* Converts exceptions into HTTP responses

### ErrorResponse

* Standard API error response object
* Contains:

  * message
  * HTTP status
  * timestamp

---

## 9. Maven Wrapper (Important)

* Maven was **not installed manually**
* Project uses **Maven Wrapper**:

  * `mvnw`
  * `mvnw.cmd`

This guarantees consistent Maven versions across machines.

---

## 10. Firebase Service Account Notes

* Service account JSON keys **cannot be re-downloaded**
* If lost, generate a **new private key** from Firebase Console
* Never commit the JSON file to GitHub
* Will be loaded using environment variables

---

## 11. Key Learnings

* Java is verbose but explicit
* Spring Boot removes most boilerplate
* Filters handle authentication, not controllers
* Backend is the **trust boundary**, frontend is not trusted

---



**This document exists so future-you does not suffer.**
