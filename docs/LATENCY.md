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

### Component Breakdown & Latency Transition Explanation
1. **Initial Post-Restore First Invocation (182.63 ms)**:
   - When AWS Lambda SnapStart restores a snapshot, the very first user invocation after the restore phase undergoes initial class-loading, JVM JIT profiling, and TLS socket initialization with DynamoDB / HTTPS endpoints. This resulted in the initial 182.63 ms execution duration recorded in the early smoke test.
2. **Subsequent Steady-State Warm Invocations (14 ms - 22 ms, Average ~18 ms)**:
   - Once the JVM tiered compiler processes hot execution paths and HTTP connection pools are established, pure handler execution drops to 14 ms - 22 ms.
3. **AWS Lambda SnapStart Restore Phase**:
   - Snapshot restore duration: **~622 ms** (observed in CloudWatch upon initial snapshot restore).
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
