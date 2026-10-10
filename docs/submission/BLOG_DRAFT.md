# Building HeatShield: A Serverless Heatwave Risk-to-Action Planner on AWS

*How we designed an open, low-latency, resilient civic emergency planning system on AWS using Java 21 SnapStart, CloudFront, and DynamoDB for Environmental Hacks 2026.*

---

## The Civic Challenge

During Indian pre-monsoon heatwaves, temperatures in cities like Ahmedabad, Delhi, and Nagpur regularly exceed 42°C. While contemporary weather apps tell citizens the current outdoor temperature, they fail the municipal officials and volunteers charged with protecting vulnerable populations. 

When an alert triggers at 12:30 PM because the mercury just crossed 42°C, the operational window has already closed. Preventive heat mitigation requires lead time: water tankers must be dispatched before 10:00 AM, outdoor construction workers must be placed on shaded rest shifts by 11:00 AM, and primary health clinics must reserve heatstroke rehydration beds before midday peak heat sets in.

To bridge this gap, we built **HeatShield**—a lightweight, rule-backed community risk planner that turns meteorological forecasts into time-bound municipal playbooks.

---

## Architecture: Why Serverless Fits Civic Public Health

Civic environmental applications face a distinct operational profile: **extreme seasonal spikes followed by long periods of baseline monitoring**. A municipal ward system might see thousands of requests during an amber heat alert, and virtually none during mild winter months.

Paying for always-on container clusters or VM instances would waste municipal budgets. We designed a pure **serverless architecture on AWS**:

```
[Browser / PWA Client]
       │
       ▼ (HTTPS / Single-Origin)
[Amazon CloudFront CDN (ap-south-1 Edge Mumbai)]
       ├──────► [Amazon S3 Web Bucket (Private via OAC)]  (HTML/CSS/JS, 55 KB total)
       └──────► [Amazon API Gateway (HTTP API v2)]
                       │
                       ▼
            [AWS Lambda (Java 21 + SnapStart)]
                       │
                       ├──────► [Open-Meteo API (with 30-min in-memory cache)]
                       └──────► [Amazon DynamoDB (On-Demand + 7-Day TTL)]
```

### Key Technical Decisions:
1. **Java 21 with SnapStart**: Java provides strong type safety and numerical precision for multi-step meteorological calculations (Rothfusz 9-term polynomial). Historically, Java suffered from 6+ second cold starts (`Init Duration: 6065 ms`). With AWS Lambda SnapStart, snapshot restore durations drop to **360 ms - 499 ms**, with post-restore first invocation executing in **168 ms** and subsequent warm handler executions averaging just **1.7 ms to 24 ms**.
2. **Unified CloudFront Distribution**: By using CloudFront to serve the static frontend from S3 and proxy `/api/*` to API Gateway, we eliminated all CORS preflight overhead. Requests from Mumbai, Delhi, and Bengaluru resolve with median edge latencies of **77 ms**.
3. **DynamoDB Single-Table Design with TTL**: State is keyed by `WS#<workspaceId>#WARD#<wardId>`. To prevent test data clutter and avoid persistent storage charges on the AWS Free Tier, every item carries an `expiresAt` epoch timestamp (7-day TTL).
4. **Resilience in Three Tiers**: If the upstream weather forecast is reachable, HeatShield computes live metrics; if upstream fails, it retrieves the latest cached snapshot; if completely offline, it falls back to a deterministic 72-hour bundled heatwave fixture.

---

## The Mathematics of Heat Risk

HeatShield does not treat temperature as a simplistic scalar. It computes two distinct meteorological signals:
1. **NOAA/NWS Rothfusz Heat Index Regression**: A 9-term polynomial evaluated only when ambient conditions cross 80°F, calculating apparent shade temperature and high/low humidity adjustments.
2. **IMD Heat Wave Plains Criteria**: Evaluates both absolute thresholds (≥45°C) and normal departure criteria (≥4.5°C departure).

Crucially, HeatShield enforces the **72-Hour Peak Composite Tier Rule**: actions are triggered by the **highest forecast hazard tier across the next 72 hours**, not the instantaneous morning temperature. Deadlines are rendered deterministically in Indian Standard Time (IST), giving field officers actionable directives like *"Tomorrow, Sat 10 Oct, before 10:00 AM"*.

---

## Results & Reflections

- **68 automated unit and contract tests** verify every formula, boundary condition, and privacy constraint.
- **55.4 KB uncompressed frontend** loads instantly even on throttled 2G connections.
- **Lighthouse audit**: 98 Performance, 96 Accessibility, 100 Best Practices.
- **Zero PII**: Ward-level planning ensures citizen privacy is preserved by design.

By leveraging AWS serverless primitives, we built a production-ready civic tool that costs virtually nothing to maintain during quiet months, yet scales seamlessly when the heat rises.
