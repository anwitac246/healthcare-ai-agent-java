# Prometheus Metrics Monitoring for Spring Boot

A no-nonsense, battle-tested guide to wiring up Prometheus with your Spring Boot app inside Docker. By the end of this, you will have live metrics flowing from your backend into Prometheus, ready to feed into Grafana whenever you want the pretty dashboards.

---

## Table of Contents

1. [How This Works](#how-this-works)
2. [Backend Setup](#backend-setup)
3. [Security Configuration](#security-configuration)
4. [Prometheus Configuration](#prometheus-configuration)
5. [Running Prometheus in Docker](#running-prometheus-in-docker)
6. [Verification](#verification)
7. [PromQL Starter Queries](#promql-starter-queries)
8. [Common Errors and Fixes](#common-errors-and-fixes)
9. [Key Concepts](#key-concepts)

---

## How This Works

Before touching any config files, here is the big picture:

```
Spring Boot (/actuator/prometheus)
        |
        v
Prometheus (scrapes your app on a schedule)
        |
        v
Grafana (turns numbers into beautiful charts)
```

Prometheus works on a **pull model**. It reaches out to your app, grabs the metrics, and stores them. Your app does not push anything anywhere. This distinction matters when things go wrong.

---

## Backend Setup

### Step 1: Add the Dependencies

Add these two to your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Step 2: Expose the Prometheus Endpoint

In your `application.yml`, tell Actuator to expose the Prometheus endpoint:

```yaml
management:
  endpoint:
    prometheus:
      enabled: true
  endpoints:
    web:
      exposure:
        include: prometheus
```

### Step 3: Confirm the Endpoint is Live

Start your app and hit this URL in your browser:

```
http://localhost:8080/actuator/prometheus
```

You should see a wall of text that looks like this:

```
# HELP jvm_memory_used_bytes The amount of used memory
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",...} 1.23456789E8
...
```

If you see that, your backend is ready. If you see a `401` or `403`, read on.

---

## Security Configuration

If your app uses Spring Security (which most production apps do), the actuator endpoint will be blocked by default. Here is how to fix that.

### Permit the Endpoint

In your security config, add a matcher to allow Prometheus traffic through:

```java
.requestMatchers("/actuator/prometheus").permitAll()
```

### Skip Custom Auth Filters

If you have custom JWT or token filters, make sure they skip actuator endpoints entirely so they do not interfere with scraping:

```java
@Override
protected boolean shouldNotFilter(HttpServletRequest request) {
    return request.getServletPath().startsWith("/actuator/");
}
```

This ensures Prometheus can scrape freely without triggering your authentication logic.

---

## Prometheus Configuration

Create a file called `prometheus.yml` in your project root. This tells Prometheus where to find your app and how often to scrape it.

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "spring-backend"
    metrics_path: "/actuator/prometheus"
    static_configs:
      - targets: ["host.docker.internal:8080"]
```

**Note on `host.docker.internal`:** When Prometheus runs inside Docker, `localhost` refers to the container itself, not your machine. Use `host.docker.internal` to reach your Spring Boot app running on your host machine. This works on Docker Desktop for Mac and Windows out of the box. On Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to your Docker run command.

---

## Running Prometheus in Docker

### One-liner Command

**PowerShell:**

```powershell
docker run -d -p 9090:9090 -v ${PWD}/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

**Bash / macOS / Linux:**

```bash
docker run -d -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

**What each flag does:**

| Flag | Purpose |
|------|---------|
| `-d` | Run in detached (background) mode |
| `-p 9090:9090` | Map port 9090 on your machine to port 9090 in the container |
| `-v ...` | Mount your local `prometheus.yml` into the container |

---

## Verification

### Open the Prometheus UI

Navigate to:

```
http://localhost:9090
```

### Check That Your App is Being Scraped

Go to **Status > Targets** in the top nav.

You should see:

```
spring-backend    UP
```

If you see `DOWN`, check the [Common Errors](#common-errors-and-fixes) section below.

---

## PromQL Starter Queries

Once your target is `UP`, head to the **Graph** tab and try these queries to get a feel for PromQL.

**Total HTTP request count:**

```promql
http_server_requests_seconds_count
```

**Request rate over the last minute:**

```promql
rate(http_server_requests_seconds_count[1m])
```

**Request rate broken down by endpoint:**

```promql
rate(http_server_requests_seconds_count[1m]) by (uri)
```

These three queries alone will tell you a lot about your app's traffic patterns.

---

## Common Errors and Fixes

### 1. Endpoint Returns 401 or 403

**Cause:** Spring Security is blocking the actuator route.

**Fix:** Permit the endpoint in your security config and make sure custom filters skip `/actuator/**`.

---

### 2. Docker Command Fails in PowerShell

**Cause:** PowerShell handles line continuation differently from Bash. Using `\` at the end of a line does not work in PowerShell.

**Fix:** Use a single-line command, or use the backtick character `` ` `` for line continuation in PowerShell.

---

### 3. Docker Cannot Pull the Prometheus Image

**Cause:** A network or proxy issue is likely intercepting HTTPS traffic.

**Fix:** Switch networks (for example, switch from office Wi-Fi to a mobile hotspot) and try again.

---

### 4. Prometheus Cannot Reach Your App

**Cause:** Using `localhost` inside a Docker container points to the container itself, not your machine.

**Fix:** Use `host.docker.internal` in `prometheus.yml` instead of `localhost`.

On Linux, add this flag to your Docker run command:

```bash
--add-host=host.docker.internal:host-gateway
```

---

### 5. Target Shows as DOWN

Run through this checklist:

- [ ] Is your Spring Boot app actually running?
- [ ] Is it running on the port specified in `prometheus.yml`?
- [ ] Is the `metrics_path` correct (`/actuator/prometheus`)?
- [ ] Is Spring Security blocking the endpoint?
- [ ] Did you use `host.docker.internal` instead of `localhost`?

---

## Key Concepts

A few ideas worth internalizing before you go further:

**Pull vs Push:** Prometheus pulls metrics from your app on a schedule. Your app does not push anything. If the scrape fails, Prometheus marks the target as `DOWN`.

**Micrometer as the Bridge:** Micrometer is the instrumentation library sitting between your Spring Boot app and Prometheus. It collects JVM, HTTP, and custom metrics and formats them in a way Prometheus understands.

**Security is Opt-Out for Actuator:** Spring Security protects everything by default. You have to explicitly permit actuator endpoints. This is the right default but catches a lot of people off guard.

**Docker Networking is Its Own World:** Containers live in an isolated network. `localhost` inside a container is the container. Plan your hostnames accordingly.

**PromQL is Worth Learning:** Even basic rate and aggregation queries can reveal a lot. Invest a little time in the [Prometheus querying docs](https://prometheus.io/docs/prometheus/latest/querying/basics/) and it pays off fast.

---

## What is Next

Once your target is green and metrics are flowing, the natural next step is hooking up Grafana. Point it at your Prometheus instance as a data source, import a Spring Boot dashboard from the Grafana dashboard library, and you will have production-ready observability in minutes.