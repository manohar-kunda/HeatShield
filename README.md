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
- **Testing**: 44 automated tests passing (26 golden tests vs NWS charts, IMD evaluation tests, playbook slice tests, and API contract tests).
- **Infrastructure as Code**: AWS SAM (`template.yaml`).
- **AWS Services**: AWS Lambda (SnapStart enabled), Amazon API Gateway HTTP API, Amazon DynamoDB On-Demand (TTL enabled), Amazon S3 + CloudFront (HTTPS), Amazon CloudWatch.

---

## Local Verification Commands

```bash
# 1. Run all automated tests (Golden tests, domain, and API handlers)
mvn clean test

# 2. Package shaded JAR
mvn package

# 3. Validate SAM infrastructure template
sam validate --lint

# 4. Run SAM local API emulator
sam local start-api
```

---

## Mandatory AI Tool Disclosure
This project was designed, implemented, and verified using Google Antigravity as an interactive pair-programming technical mentor and execution coach.
