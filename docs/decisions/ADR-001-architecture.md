# ADR-001: Language Runtime, Packaging, and Cold Start Optimization

- **Status**: Approved
- **Date**: 2026-10-09
- **Decision Owner**: Senior Java/AWS Architect & Ward Relief Engineer

## 1. Context and Problem Statement
HeatShield requires a robust, strictly typed backend to execute deterministic heat risk mathematics and operational action prioritisation. The system must run on AWS Lambda serverless compute with zero idle cost.

Key challenges on AWS Lambda with Java:
- JVM initialization cold starts can exceed 3–5 seconds if bloated frameworks (Spring Boot, Micronaut) are introduced.
- Memory footprint impacts cost (billed per GB-second).

## 2. Decision
1. **Runtime**: Amazon Corretto / Java 21 (`java21` managed runtime on AWS Lambda).
2. **Framework Choice**: **Zero DI frameworks** (Pure POJO handlers with vanilla dependency wiring).
3. **HTTP Client**: Use lightweight `java.net.http.HttpClient` or URL-connection based client rather than heavy Netty/Apache HTTP clients.
4. **AWS SDK**: AWS SDK for Java v2 DynamoDB client (`software.amazon.awssdk:dynamodb`) configured with lazy initialization and minimal Apache/Netty overhead (or standard URL Connection client).
5. **Cold Start Mitigation**: Enable AWS Lambda **SnapStart** in `template.yaml` (`AutoPublishAlias: live`, `SnapStart: { ApplyOn: PublishedVersions }`).
6. **Build & Packaging**: Apache Maven with `maven-shade-plugin` producing an unbloated uber-jar.

## 3. Alternatives Considered and Trade-Offs

| Option | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- |
| **Java 21 Pure POJO + SnapStart** | Sub-second cold start (typically < 300ms with SnapStart), fast warm execution (< 10ms), zero dependency bloat, native type safety. | Requires manual object wiring in handler. | **Selected** |
| **Spring Boot / Spring Cloud Function** | Familiar inversion-of-control, large ecosystem. | 4–8 second cold starts, massive fat JAR (40MB+), high memory requirement (1024MB+). | Rejected |
| **Node.js 20 / Python 3.12** | Fast cold start (< 150ms) without tuning. | Lacks Java strong typing for critical numerical/domain calculations; deviates from project core competency. | Rejected |

## 4. Measurement & Verification Plan
- We do not assert arbitrary latency or JAR size numbers in advance.
- Post-build, we will measure:
  1. Actual shaded JAR size on disk (`target/HeatShield-1.0.0.jar`).
  2. Local execution time through JUnit test suites.
  3. CloudWatch cold start `Init Duration` and warm `Duration` after deployment on AWS.
