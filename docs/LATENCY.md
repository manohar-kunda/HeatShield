# HeatShield Performance & Latency Benchmarks

> **Measurement Date**: October 2026  
> **Target Region**: AWS `ap-south-1` (Mumbai)  
> **Client Location**: India (direct broadband)  
> **Stack ID**: `heatshield-app`  
> **CloudFront Distribution**: `d2ijd5tuo68h8.cloudfront.net` (Distribution ID: `E2REXQRKCWEVMK`)  
> **HTTP API Gateway Origin**: `m4oh9vt5d8.execute-api.ap-south-1.amazonaws.com`

---

## 1. End-to-End Latency Profile

Measurements collected across 20 consecutive requests against `/api/health` following warmup:

| Target Flow / Endpoint | Samples ($N$) | Min (ms) | Median / $p_{50}$ (ms) | $p_{95}$ (ms) | Max (ms) | Note |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **GET /api/forecast (cache miss)** | 20 | 126 | **251** | 483 | 4409 | Real Open-Meteo external ingestion + 72h window calculation |
| **GET /api/forecast (cache hit)** | 20 | 87 | **101** | 142 | 318 | Pre-cached DynamoDB read + Rothfusz evaluation |
| **POST /api/assessments (What-If)** | 20 | 105 | **124** | 315 | 361 | Custom parameter assessment + DynamoDB write |
| **PATCH /api/actions (Field update)** | 20 | 87 | **107** | 154 | 252 | Atomic status & screened note update in DynamoDB |
| **GET /api/health (CloudFront edge)** | 20 | 53 | **77** | 290 | 1286 | Health baseline through edge proxy |
| **GET /api/health (Direct API)** | 20 | 45 | **53** | 85 | 158 | Direct connection to `ap-south-1` HTTP API |

### Caching Layers & Data Tiering Architecture
HeatShield implements three explicit caching and resilience tiers:
1. **Tier 1 (In-Memory per Execution Environment)**: `ForecastIngestionService` maintains a concurrent in-memory cache with a 30-minute expiration per Lambda execution environment. Measured in: **GET /api/forecast (cache hit)**.
2. **Tier 2 (DynamoDB Snapshot Persistence)**: When live weather is ingested or custom assessments are computed, the full assessment snapshot is stored in DynamoDB under the partition key `WS#<workspaceId>#WARD#<wardId>`. If external APIs are unavailable, this snapshot is served. Measured in: **GET /api/forecast (cache hit)** and **POST /api/assessments**.
3. **Tier 3 (Bundled Deterministic Fallback)**: If both external weather APIs and DynamoDB read paths are unreachable, the application falls back to a bundled 72-hour synthetic baseline heatwave fixture.
*(Note: CloudFront does NOT cache `/api/*` routes; API responses are routed directly to API Gateway with caching disabled).*

### Component Breakdown & Latency Transition Explanation
1. **Initial Post-Restore First Invocation (182.63 ms — [UNVERIFIED pending CloudWatch REPORT lines])**:
   - The figure of 182.63 ms was originally recorded during early prototype testing. Whether this represents snapshot restoration duration or cold JIT startup execution will be determined definitively from live CloudWatch `REPORT` log excerpts (`Restore Duration` vs `Duration`). Until fresh live CloudWatch log lines are extracted, this distinction remains **UNVERIFIED**.
2. **Subsequent Steady-State Warm Invocations (14 ms - 22 ms, Average ~18 ms)**:
   - Once hot JVM paths are compiled and DynamoDB HTTP connections are pooled, warm Lambda handler execution executes within 14 ms - 22 ms.
3. **AWS Lambda SnapStart Restore Phase**:
   - Initial snapshot restore duration: **~622 ms** (observed during initial deployment publish phase; to be re-verified from CloudWatch logs).
4. **Network Transit / CDN Edge Overhead**:
   - Client-to-Mumbai public Internet RTT: **~25 - 40 ms**.
   - CloudFront reverse-proxy forwarding to API Gateway origin: **~15 - 25 ms**.

---

## 2. Frontend Bundle Size & Budget Compliance

Per the architectural constraint, the frontend must remain ultra-lightweight ($< 100\text{ KB}$ uncompressed) to operate effectively on constrained 2G/3G civic mobile networks.

| File Asset | Uncompressed Size | Gzip / Compressed Size (Est.) | Role |
| :--- | :---: | :---: | :--- |
| `index.html` | 11.68 KB | ~3.4 KB | Accessible semantic DOM structure |
| `style.css` | 16.62 KB | ~3.8 KB | Custom CSS variable design system & print styles |
| `app.js` | 24.76 KB | ~6.2 KB | Zero-dependency vanilla client application |
| `sw.js` | 1.88 KB | ~0.7 KB | Service worker cache & offline fallback |
| `manifest.json` | 0.52 KB | ~0.2 KB | PWA web application manifest |
| **Total Frontend Bundle** | **55.45 KB** | **~14.3 KB** | **Passed: Well within 100 KB budget** |

---

## 3. Cost & Free-Tier Operational Safety

- **Lambda Memory**: 512 MB.
- **Average Warm Execution**: 18 ms.
- **Compute Cost**: Within the monthly 1,000,000 free requests and 3,200,000 seconds of compute time for AWS Free Tier.
- **DynamoDB**: On-Demand read/write with 7-day TTL expiration to eliminate data storage buildup.
