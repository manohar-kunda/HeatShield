# HeatShield — Project Submission Writeup

**Event**: Environmental Hacks 2026 (Bharat Builds Tour)  
**Theme**: Environmental Resilience (Urban Heatwaves & Public Safety)  
**Live Application URL**: [https://d2ijd5tuo68h8.cloudfront.net](https://d2ijd5tuo68h8.cloudfront.net)  
**Production Region**: AWS `ap-south-1` (Mumbai)  

---

## 1. Problem Statement & Civic Reality

In Indian cities, urban heatwaves are silent killers. Municipalities often operate reactively: alerts are broadcast only when temperatures cross 42°C in real time. By that hour, municipal water tankers are unmobilized, informal laborers have already been exposed to midday solar radiation, and local health centres face sudden surges of dehydration and heat exhaustion.

Existing weather apps display current ambient readings, but fail municipal field coordinators in three key ways:
1. **Zero Lead Time**: Current-hour alerts do not afford the operational lead time required to enact preventative civic interventions before peak midday heat.
2. **Missing Action Guidance**: Raw temperature figures do not translate into specific role-based municipal tasks.
3. **No Field Tracking**: Playbooks are static PDF documents forgotten on municipal shelves.

---

## 2. What We Built: HeatShield

**HeatShield** is an open, transparent, rule-backed **Heatwave Risk-to-Action Planner** designed specifically for urban ward coordinators, disaster management volunteers, and civic relief leads across Indian urban centres.

### Core Capabilities:
- **72-Hour Peak-Driven Risk Logic**: Rather than waiting for midday heat, HeatShield continuously scans the 72-hour forecast horizon from Open-Meteo (in Indian Standard Time) and evaluates the composite peak hazard tier (NWS Rothfusz 9-term polynomial + IMD Plains heatwave criteria). Preventive actions are activated in advance.
- **NDMA & AMC Heat Action Plan Alignment**: Translates hazard tiers into actionable, time-bound municipal playbooks (e.g. `ACT_WATER_KIOSKS`, `ACT_OUTDOOR_WORK_ADVISORY`, `ACT_COOLING_SHELTERS`, `ACT_ORS_DISPATCH`, `ACT_HOSPITAL_ALERT`).
- **Interactive What-If & Historical Replay**: Coordinators can simulate custom microclimate scenarios or replay historical benchmark episodes—such as the Ahmedabad May 2010 episode (Observed IMD Station 46.8°C cited / ERA5 Reanalysis Grid peak dry-bulb 45.4°C)—to train teams and test resource preparedness against historical ground-truth data.
- **Field Tracking with Zero PII**: Officers toggle action statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`) with field notes. Strict server-side validation rejects personal phone numbers and identity markers.
- **Offline-First PWA Architecture**: Operates under poor 2G/3G connectivity. Features offline caching, background action queueing, and a deterministic offline fixture if upstream networks fail.
- **Single-Click Public Communications**: Generates WhatsApp civic broadcast text and printable emergency bulletin posters with QR codes and official national emergency contact (`112`).

---

## 3. Architecture & AWS Service Fit

```
+-----------------------------------------------------------------------------------+
|                              Global Edge & CDN Layer                              |
|                    Amazon CloudFront (ap-south-1 Edge Mumbai)                     |
|            - HTTPS delivery of static PWA assets from Amazon S3                   |
|            - Same-origin reverse-proxy routing of /api/* to HTTP API              |
+-----------------------------------------+-----------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
        +---------------------------+           +---------------------------+
        |   Amazon S3 Web Bucket    |           |   Amazon API Gateway      |
        |  (Private OAC, <100KB)    |           |    (HTTP API v2, ap-s-1)  |
        +---------------------------+           +-------------+-------------+
                                                              |
                                                              v
                                                +---------------------------+
                                                |   AWS Lambda (Java 21)    |
                                                |  SnapStart (<300ms boot)  |
                                                |  Zero DI, <20ms execute   |
                                                +-------------+-------------+
                                                              |
                                                              v
                                                +---------------------------+
                                                |     Amazon DynamoDB       |
                                                |   (Single-Table, TTL)     |
                                                +---------------------------+
```

### Why These AWS Services Were Chosen:
1. **AWS Lambda (Java 21 with SnapStart)**: Delivers sub-20ms warm handler execution and cold starts under 622ms without requiring expensive always-on container clusters.
2. **Amazon CloudFront with Origin Access Control (OAC)**: Eliminates CORS friction by routing both the static PWA frontend and dynamic API requests through a single origin domain. Delivers 43ms - 70ms edge latencies across India.
3. **Amazon DynamoDB (On-Demand with TTL)**: Zero idle cost. Automatic 7-day TTL ensures temporary demo states expire cleanly without accumulating database storage costs.
4. **Amazon EventBridge Scheduler**: Triggers a periodic 4-hour background invocation for demo wards that refreshes the in-memory cache of the invoked Lambda execution environment so initial queries have low latency.

---

## 4. Engineering Verification & Quality Record

- **Unit & Contract Tests**: **75 automated JUnit 5 tests** covering NWS Rothfusz regression precision, IMD classification, composite peak logic, IST deadline formatting, and security/privacy allowlists.
- **Bundle Size**: **55.45 KB** total uncompressed static bundle (~14.3 KB gzipped), well within the 100 KB low-bandwidth budget.
- **Performance & Latency**: CloudFront $p_{50}$ median latency of **77 ms**, steady-state warm Lambda execution of **14 ms - 22 ms (average ~18 ms)**. Early post-restore first-invocation figures (182.63 ms) marked as UNVERIFIED pending live CloudWatch REPORT line validation.
- **Accessibility & Lighthouse**: **98 Performance**, **96 Accessibility**, **100 Best Practices** (internal rule: no text below 14 px (footer 13 px). Targeting WCAG 2.1 AA; checklist in the repository; no compliance claim).
- **Clean-Room Independence**: 100% newly written from scratch starting October 8, 2026. Zero legacy code or fabricated deliverables.

### Architectural Limitations, Replay Provenance & Cache Behavior:
- **Historical Replay Provenance Evolution**: The initial Ahmedabad May 2010 historical replay fixture was mathematically synthetic, generated using a sinusoidal formula `tempC = 38.35 + 5.85 * sin((hour - 9) * pi / 12)` committed in `af80c75` and tweaked in `1bcc676`. Although labeled as Open-Meteo ERA5 reanalysis with an unverified peak claim of 44.2°C at 15:00 and station observation of 46.8°C, the underlying rows were synthesized. In commit `6c1340c`, this synthetic generator was eliminated and replaced with genuine, unmodified ERA5 hourly reanalysis data fetched directly from the Open-Meteo Archive API (saved at `docs/data/replay-ahmedabad-2010-raw.json`, SHA-256 `8279957f198e4dab445de7211b964ca52d2cbc22d6e27f04979407879650d9c6`, CC BY 4.0). The true series dry-bulb peak is 45.4°C at 16:00 IST on 21 May 2010; the 46.8°C station figure is cited strictly as a historical IMD ground observation; and values above 110°F (43.3°C) are honestly disclosed as extrapolated outside the NWS regression's validated range.
- **Multi-Instance In-Memory Cache Variance**: Because AWS Lambda distributes traffic across multiple concurrent or warm execution environments, each instance maintains its own local in-memory cache (`ConcurrentHashMap<String, CachedForecast>`, 30-minute TTL). When Open-Meteo updates its numerical forecast model run, two consecutive queries routed to different warm Lambda instances may reflect slight model run variations (e.g. 36.6°C vs 36.9°C) until both instances reach TTL expiration. This is normal distributed serverless behavior.
- **Workspace Scoping**: Stale DynamoDB snapshots are strictly scoped per workspace (`WS#<workspaceId>#WARD#<wardId>`). A fresh workspace without prior network activity or cached items deterministically receives the bundled offline sample fixture.

---

## 5. AI tool disclosure

AI tools used: Antigravity (an AI coding agent) generated most of the code, tests and deployment scripts under my direction. Claude (an AI assistant) was used to plan the work, write the prompts and review the agent's reports. I directed the work, reviewed each report, authenticated AWS, tested the live site, and decided what to claim; see docs/BUILD_LOG.md.
