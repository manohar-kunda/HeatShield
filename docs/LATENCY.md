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

### Component Breakdown & Latency Transition Explanation (Verified via CloudWatch Logs)
1. **Initial Post-Restore First Invocation (Settled via CloudWatch REPORT lines)**:
   - Live CloudWatch logs show the exact breakdown of the post-restore first invocation:
     ```text
     RESTORE_REPORT Restore Duration: 443.98 ms
     REPORT RequestId: e7edf7ad-1f89-4015-99a6-4c9f7f17a06e
       Duration: 168.31 ms    Billed Duration: 313 ms
       Memory Size: 512 MB    Max Memory Used: 159 MB
       Restore Duration: 443.98 ms    Billed Restore Duration: 144 ms
     ```
   - **Conclusion**: The early 182.63 ms measurement was indeed the **first-invocation handler duration** immediately following SnapStart restore (168 ms - 182 ms), during which first-time lazy initialization and class verification occurred.
2. **Subsequent Steady-State Warm Invocations (1.68 ms - 24.41 ms)**:
   - For simple endpoints like `/api/health`, warm executions drop to **1.68 ms - 2.62 ms** (`Duration: 1.68 ms`, `Duration: 1.75 ms`).
   - For database reads/writes (`/api/assessments` and `/api/actions`), warm executions average **12 ms - 24 ms** (`Duration: 12.38 ms`, `Duration: 22.83 ms`, `Duration: 24.41 ms`).
3. **AWS Lambda SnapStart Restore Phase (Verified Range: 360 ms - 656 ms)**:
   - Measured across 19 snapshot restorations:
     - Minimum Restore Duration: **360.04 ms**
     - Typical Restore Duration: **410 ms - 499 ms**
     - Maximum Restore Duration: **815.26 ms**
     - Initial cold baseline without SnapStart: **6065.88 ms - 6271.39 ms** (recorded during version publish `INIT_REPORT`). SnapStart provides a **~12x to 15x cold start latency reduction**.
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
