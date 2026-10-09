# HeatShield — Community Heatwave Risk-to-Action Planner

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://docs.aws.amazon.com/corretto/)
[![AWS Serverless](https://img.shields.io/badge/AWS-SAM%20%7C%20Lambda%20%7C%20DynamoDB-blue.svg)](https://aws.amazon.com/serverless/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

HeatShield converts ambient weather forecasts and community context into transparent, rule-backed heat risk assessments, prioritised emergency protective actions, and verifiable action completion tracking.

---

## Architecture Diagram

```mermaid
flowchart TD
    Client["Browser / Coordinator Phone<br/>(PWA Shell / Vanilla JS)"]
    
    subgraph AWSCloud["AWS Region: ap-south-1"]
        CF["Amazon CloudFront CDN<br/>(HTTPS Distribution)"]
        S3["Amazon S3 Static Bucket<br/>(Origin Access Control)"]
        APIGW["Amazon API Gateway<br/>(HTTP API v2)"]
        Lambda["AWS Lambda Function<br/>(Java 21 + SnapStart)"]
        DDB[("Amazon DynamoDB<br/>(Single-Table On-Demand)")]
        CW["Amazon CloudWatch<br/>(Logs & Metric Alarms)"]
    end

    ExtWeather["Open-Meteo Weather API<br/>(Hourly 72h Forecast)"]

    Client -->|HTTPS Static Assets| CF
    CF -->|Secure OAC Fetch| S3
    Client -->|REST API Calls| APIGW
    APIGW -->|Proxy Invoke| Lambda
    Lambda -->|Read / Write State| DDB
    Lambda -.->|3s Timeout Fetch| ExtWeather
    Lambda -->|Emit Metrics & Errors| CW
```

---

## Core Principles & Transparency

1. **Mathematically Rigorous Heat Index**: Implements the official National Oceanic and Atmospheric Administration (NOAA) / National Weather Service (NWS) Rothfusz 9-term polynomial regression with Steadman baseline pre-check, low-RH, and high-RH adjustments.
2. **Dual-Signal Protection**: Evaluates both NWS apparent temperature tiers and official India Meteorological Department (IMD) maximum temperature criteria for plains stations ($\ge 40.0^\circ\text{C}$ gate, $\ge 45.0^\circ\text{C}$ Heat Wave, $\ge 47.0^\circ\text{C}$ Severe Heat Wave).
3. **Data-Driven Playbook**: Action checklists are grounded in the National Disaster Management Authority (NDMA) 2019 Guidelines and the Ahmedabad Municipal Corporation Heat Action Plan (HAP).
4. **Zero PII**: No personal names, phone numbers, or health records are stored. All records pertain to aggregated community wards.

> **Operational Disclaimer**: HeatShield provides environmental planning and operational risk indicators. It is not an individual medical diagnostic tool or personal health advisory. Always adhere to official bulletins from the India Meteorological Department and local disaster management authorities.

---

## Technology Stack & Measured Metrics

- **Runtime**: Amazon Corretto / Java 21 (`release 21`).
- **Framework**: Zero DI framework (pure POJO architecture).
- **Packaging**: Uber-jar produced via `maven-shade-plugin` (measured size: **10.0 MB**).
- **Testing**: 50 automated tests passing (26 golden tests vs NWS charts, IMD evaluation tests, playbook slice tests, forecast parsing tests, and API contract tests).
- **Infrastructure as Code**: AWS SAM (`template.yaml`).
- **AWS Services**: AWS Lambda (SnapStart enabled), Amazon API Gateway HTTP API, Amazon DynamoDB On-Demand (TTL enabled), Amazon S3 + CloudFront (HTTPS with OAC), Amazon CloudWatch, AWS Budgets.
- **Production URL**: [`https://d2ijd5tuo68h8.cloudfront.net`](https://d2ijd5tuo68h8.cloudfront.net)

---

## Local Development & Verification Commands

### 1. Run Automated Unit & Golden Tests
```bash
cd backend
mvn clean test
```

### 2. Run Local Dev Server (No Docker / No SAM required)
```bash
# Serves both the API at /api/* and static frontend at / on http://localhost:8085
java -cp backend/target/heatshield-backend-1.0.0.jar heatshield.dev.LocalDevServer
```

### 3. Run Automated Smoke Verification Script
```powershell
# Local smoke test:
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -BaseUrl "http://localhost:8085"

# Live CloudFront smoke test:
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -BaseUrl "https://d2ijd5tuo68h8.cloudfront.net"
```

---

## Documentation Links

- [5-Minute Stranger Test Protocol](docs/STRANGER_TEST.md)
- [3-Minute Demo Video Script](docs/DEMO_SCRIPT.md)
- [Evidence & Scientific Verification Record](docs/VERIFICATION.md)
- [Originality & Clean-Room Statement](docs/ORIGINALITY.md)
- [Architecture Decision Records (ADRs)](docs/decisions/)

---

## Mandatory AI Tool Disclosure
This project was designed, implemented, and verified using Google Antigravity as an interactive pair-programming technical mentor and execution coach.
