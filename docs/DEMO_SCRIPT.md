# HeatShield — 3-Minute Demo Video Script

> **Video Duration**: Exactly 3 minutes (180 seconds)  
> **Speaker**: Lead Developer & Architect  
> **Context**: Bharat Builds Tour 2026 / Environmental Hacks (Track 02: Heat and Water)  
> **Live URL Shown on Screen**: `https://d2ijd5tuo68h8.cloudfront.net`

---

## Breakdown & Timings

### Act 1: The Problem & The Solution (0:00 - 0:40) [40s]

**Visual**: Camera on speaker, cutting to screen showing HeatShield live web app on mobile/desktop (`https://d2ijd5tuo68h8.cloudfront.net`).  
**On Screen**: App loads in under 100ms via CloudFront CDN.

> *"In May 2024, cities across North and Central India experienced heat indices exceeding 50°C. Urban heat islands in densely built wards like Kalupur in Ahmedabad and Connaught Place in Delhi become dangerous for informal workers, transit commuters, and street vendors.*
>
> *Yet, traditional weather apps only give an ambient temperature number. They don't tell a municipal ward officer or community volunteer **what actions can be taken right now** to mitigate heat stress.*
>
> *This is **HeatShield** — an automated, community heatwave risk-to-action planner that translates ambient meteorological forecasts into transparent, rule-backed risk indicators and trackable, prioritised civic playbooks."*

---

### Act 2: Dual-Signal Science & 72-Hour Horizon (0:40 - 1:20) [40s]

**Visual**: Screen recording zooming into the **Operational Hazard Assessment** and **72-Hour Timeline**.

> *"HeatShield uses a **dual-signal scientific engine**:*
>
> *First, we compute the official NOAA Rothfusz Heat Index using Steadman's iterative formula and the complete 9-term polynomial with low- and high-humidity adjustments. Right now, for Ahmedabad Central, the ambient temperature is 36.5°C with 26% humidity, yielding an apparent heat index of 36.0°C in the shade. Crucially, we also compute the **direct sunlight exposure index**, which adds 8.3°C (+15°F), pushing the effective thermal stress past 44°C for outdoor workers.*
>
> *Second, we integrate the official **India Meteorological Department (IMD) Plains criteria**, tracking actual maximums and temperature departures.*
>
> *Below the summary, our **72-hour thermal stress timeline** parses real-time hourly forecasts from Open-Meteo, identifying the exact peak thermal stress window — tomorrow between 12:00 and 16:00 — so teams can deploy resources before the heat peaks."*

---

### Act 3: Interactive Playbook & What-If Simulation (1:20 - 2:05) [45s]

**Visual**: Demonstrating the What-If Simulator and Action Tracking.

> *"Let's test an acute heatwave simulation using our **What-If Simulator**. If ambient temperatures climb to 42.5°C with 48% humidity and an IMD departure of +5.5°C...*
>
> *(Click 'Run What-If Assessment')*
>
> *HeatShield instantly escalates to **EXTREME DANGER (Red Alert)**. Notice how our engine flags that this apparent temperature (59.7°C) is outside the 80–110°F validation range, maintaining scientific honesty.*
>
> *Automatically, HeatShield triggers our **Suggested Action Playbook**, adapted from the NDMA 2019 Guidelines and the Ahmedabad Heat Action Plan:*
> - *Activating shaded drinking water kiosks at bus stands,*
> - *Advising shaded rest cycles for outdoor labor,*
> - *Opening daytime municipal cooling centers, and*
> - *Alerting urban health centers to reserve heatstroke beds.*
>
> *As a ward officer, I can toggle any action to **IN PROGRESS**, log real-time field notes like 'Tanker deployed at station', and mark it **COMPLETED**. Every mutation is saved directly to AWS DynamoDB."*

---

### Act 4: Civic Communication & Serverless AWS Architecture (2:05 - 2:45) [40s]

**Visual**: Clicking 'Copy WhatsApp Alert', showing formatted text, showing print notice, then showing CloudWatch / SAM architecture slide.

> *"To mobilize the community, HeatShield offers **one-tap civic dissemination**:*
> - *With one click on **'Copy WhatsApp Alert'**, a bilingual English and Hindi operational advisory is copied, ready to broadcast to ward councillor groups and RWA volunteers.*
> - *Or click **'Print A4 Notice'** for a clean, noticeboard-ready poster.*
>
> *Behind the scenes, HeatShield runs on a high-efficiency AWS serverless architecture in `ap-south-1` (Mumbai):*
> - *Java 21 compiled natively on Amazon Linux 2023 with **AWS Lambda SnapStart**, delivering sub-650ms cold starts and 80ms warm latencies.*
> - *An HTTP API Gateway connected to **DynamoDB On-Demand** with automated 4-hour TTL expiration for privacy and cost control.*
> - *Static assets hosted on S3 behind **CloudFront with Origin Access Control**, routing `/api/*` same-origin with zero CORS overhead and low-latency global CDN caching.*
> - *And zero citizen PII is ever collected or stored."*

---

### Act 5: Conclusion & Hackathon Call to Action (2:45 - 3:00) [15s]

**Visual**: Full-screen view of the responsive HeatShield dashboard and closing slide with GitHub repo and live URL.

> *"Heatwaves are silent disasters, but with rule-backed clarity and proactive community planning, they don't have to be fatal.*
>
> *HeatShield brings science, local action, and resilient cloud engineering together. Try it live at `https://d2ijd5tuo68h8.cloudfront.net`. Thank you!"*

---

## Technical Proof Summary for Video Display

- **Stack Name**: `heatshield-app`
- **Region**: `ap-south-1` (Mumbai)
- **Live CloudFront Distribution**: `d2ijd5tuo68h8.cloudfront.net`
- **Measured Cold Start (SnapStart Restore)**: `622.65 ms`
- **Measured Warm Latency**: `78 - 112 ms`
- **Zero-PII Compliance**: Ward ID & Role tokens only
- **Automated Test Suite**: 50 JUnit 5 tests passing (100% green)
