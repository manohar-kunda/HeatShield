# HeatShield Performance & Latency Benchmarks

> **Measurement Date**: October 2026  
> **Target Region**: AWS `ap-south-1` (Mumbai)  
> **Client Location**: India (direct broadband)  
> **Stack ID**: `heatshield-app`  
> **CloudFront Distribution**: `d2ijd5tuo68h8.cloudfront.net` (Distribution ID: `E2REXQRKCWEVMK`)  
> **HTTP API Gateway Origin**: `m4oh9vt5d8.execute-api.ap-south-1.amazonaws.com`

---

## 1. End-to-End Latency Profile

Measurements were collected across 15 consecutive requests against `/api/health` following warmup:

| Target Endpoint | Samples ($N$) | Min (ms) | Median / $p_{50}$ (ms) | $p_{95}$ (ms) | Max (ms) | Note |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **CloudFront CDN Edge** | 15 | 43 | **70** | 539 | 895 | Includes TLS edge handshake & reverse-proxy routing |
| **Direct API Gateway** | 15 | 41 | **46** | 93 | 146 | Direct connection to `ap-south-1` HTTP API |

### Component Breakdown
1. **AWS Lambda Execution Duration (Warm)**:
   - Handler CPU time: **14 ms - 22 ms** (Zero DI framework, pre-allocated singletons).
2. **AWS Lambda SnapStart Cold Start**:
   - Restore Duration: **~622 ms** (observed in CloudWatch upon initial snapshot restore).
   - Subsequent warm invocations: **~18 ms**.
3. **Network Transit / CDN Edge Overhead**:
   - Public round-trip time (Client to Mumbai): **~25 - 40 ms**.
   - CloudFront reverse-proxy forwarding to API Gateway: **~15 - 25 ms**.

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
