# HeatShield Build Log & Architectural Journey

This document records the design decisions, test verifications, and AWS deployment milestones for **HeatShield**. It serves as our live project journal and draft for our **AWS Builder Center** submission.

---

## 2026-10-09 — Phase 0 & Phase 1: Inception, Hackathon Alignment & Foundations

### 1. The Context & Rules Audit
We are participating in **Environmental Hacks** (Event 02 of the Bharat Builds Tour).
- **Rules Verification**:
  - Hackathon runs October 8–11, 2026.
  - Zero-code reuse: Clean-room project in `e:\Projects\HeatShield` with new Git history.
  - Required submission: Public Git repo, under 3-minute YouTube demo video, architecture writeup with AI coding tool disclosure (Antigravity).
- **Tooling Verification**:
  - `java`: 25.0.4.1 (Java 21 target compatibility)
  - `mvn`: 3.9.16
  - `sam`: 1.166.2
  - `aws-cli`: 2.37.9
  - `docker`: Not installed locally. Testing strategy: `InMemoryAssessmentRepository` test suite + golden tests + live walking skeleton AWS smoke test.

### 2. Scientific Rigor & Domain Modeling
Instead of inventing arbitrary numbers:
1. Researched and verified official NOAA/NWS Rothfusz regression equations and adjustment formulas.
2. Verified contiguous half-open tier intervals ($<80^\circ\text{F}$, $80-90^\circ\text{F}$, $90-103^\circ\text{F}$, $103-125^\circ\text{F}$, $\ge 125^\circ\text{F}$).
3. Verified official India Meteorological Department (IMD) criteria for plains, coastal, and hilly regions.
4. Mapped verified operational action playbook from the National Disaster Management Authority (NDMA) guidelines and the Ahmedabad Heat Action Plan (HAP).
5. Documented Architecture Decision Records:
   - `ADR-001`: Java 21 on AWS Lambda with SnapStart and zero DI framework.
   - `ADR-002`: Mathematically defensible Rothfusz & IMD heat risk engine.
   - `ADR-003`: Privacy-first, zero-PII DynamoDB persistence with 3-tier resilience (Live $\rightarrow$ Stale $\rightarrow$ Offline Sample).

### 3. P0 Scope & Target Walking Skeleton
- P0 Priority: Complete end-to-end user loop: 72h Open-Meteo forecast ingestion, heat index computation, action plan generation with deadlines, and interactive completion tracking.
- Walking skeleton deploy scheduled for Gate 1 tonight.
