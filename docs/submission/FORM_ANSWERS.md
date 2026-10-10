# Bharat Builds Tour 2026: Official Submission Form Answers

**Project Title**: HeatShield — Community Heatwave Risk-to-Action Planner  
**Solo Participant**: Manohar Kunda  
**Track**: Environmental Hacks (Challenge 02: Bad air, heatwaves, floods, water shortage and waste)  
**Live Production URL**: https://d2ijd5tuo68h8.cloudfront.net  
**Public Code Repository**: https://github.com/manoharkunda/HeatShield `[CONFIRM GITHUB REPO URL PLACEHOLDER]`  
**3-Minute Video Demo URL**: `[PASTE 3-MINUTE YOUTUBE / DRIVE VIDEO LINK HERE]`  
**AWS Builder Center Verification**: `[CONFIRM BUILDER CENTER USERNAME / ID]`  

---

## Form Questions & Prepared Responses

### 1. Project Overview & Problem Statement (Max 200 words)
> **Question**: What environmental problem does your project address, and why does it matter?
>
> **Answer**:
> Extreme heatwaves across Indian urban municipalities cause avoidable morbidity and mortality among outdoor labourers, slum dwellers, and vulnerable citizens. While macroeconomic forecasts exist, municipal coordinators lack an actionable, transparent planning tool that translates ambient observations into specific, time-bound ward interventions. HeatShield bridges this "last-mile risk-to-action gap" by calculating apparent heat indices using the NOAA/NWS Rothfusz polynomial combined with IMD heatwave thresholds. It automatically prioritises NDMA-aligned civic actions (water tanker deployment, shaded rest cycles, hospital cooling wards) and tracks implementation with field notes under a strict zero-PII privacy model.

### 2. Architecture & AWS Services Used
> **Question**: Which AWS services did you use and why?
>
> **Answer**:
> HeatShield is built on a serverless, single-region architecture in `ap-south-1` (Mumbai):
> - **Amazon CloudFront**: Single-origin CDN serving static PWA assets from edge locations and proxying `/api/*` to eliminate CORS overhead, protected by strict Content Security Policies.
> - **Amazon S3**: Private static hosting secured via Origin Access Control (OAC).
> - **Amazon API Gateway (HTTP API v2)**: Low-latency REST interface with built-in route burst/rate throttling.
> - **AWS Lambda (Java 21 + SnapStart)**: Pure POJO execution engine achieving sub-20ms warm latency and fast snapshot restore.
> - **Amazon DynamoDB**: On-Demand single-table store with multi-tenant workspace isolation and 7-day TTL expiration to eliminate data buildup.
> - **Amazon CloudWatch & AWS Budgets**: Automated operational error alarms and $5.00 cost threshold alerts via SNS.

### 3. Verification, Testing & Originality
> **Question**: How did you verify your project and ensure originality?
>
> **Answer**:
> All code was authored from scratch following hackathon opening on October 8, 2026. Scientific equations are verified against NOAA/NWS test charts across 26 golden unit tests (68/68 automated tests passing). End-to-end integration is proven by automated smoke scripts, multi-tenant workspace isolation tests, and live CloudFront latency benchmarks ($p_{50} = 77\text{ ms}$). To test severe scenarios outside mild autumn weather, HeatShield includes an ERA5-anchored historical replay of the May 2010 Ahmedabad heatwave.

### 4. Accessibility & Open Data
> **Question**: How is your solution accessible and what data sources are leveraged?
>
> **Answer**:
> The UI is a lightweight, zero-dependency PWA (<60 KB bundle) targeting WCAG 2.1 AA standards, featuring keyboard navigation, screen-reader aria attributes, high-contrast hazard palettes, and offline service-worker caching. Real-time weather is ingested from Open-Meteo (CC BY 4.0), and guidance follows NDMA 2019 National Guidelines and AMC Heat Action Plans.
