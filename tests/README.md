# HeatShield Testing & Quality Verification Tooling

This directory contains automated testing suites verifying mathematical calculation accuracy, edge security rules, localization fidelity, and visual layout stability.

---

## 1. Test Suites Inventory

### A. Backend Unit & Contract Tests (`mvn test`)
- **Location**: `backend/src/test/java/heatshield/`
- **Runner**: Maven + JUnit 5 (`JUnitPlatformProvider`)
- **Key Suites**:
  - `RothfuszCalculatorTest`: 26 golden equation tests matching NOAA/NWS published tables, including boundary edge cases ($T < 80^\circ\text{F}$, low humidity subtraction adjustments, high humidity addition adjustments, Steadman approximation crossover).
  - `ImdHeatwaveCategoryTest`: IMD plains criteria verification ($\ge 40^\circ\text{C}$ threshold, $+4.5^\circ\text{C}$ departure, $+6.4^\circ\text{C}$ severe departure, absolute $\ge 45^\circ\text{C}$ heatwave, absolute $\ge 47^\circ\text{C}$ severe heatwave).
  - `AssessmentServiceTest`: Deterministic deadline calculation across fixed clock instants (01:36, 08:00, 14:30, 23:30 IST) ensuring deadlines are chronologically future-aligned.
  - `LambdaApiHandlerTest`: 21 contract tests for API Gateway HTTP responses, CORS headers, multi-tenant workspace isolation, unknown ward 400 rejection, and note privacy filtering.

### B. Mechanical Hindi & i18n Validation (`node tests/i18n-hindi-test.js`)
- **Runtime**: Node.js (standard built-in modules `fs`, `assert`, `path` — zero third-party dependencies).
- **Verifications**:
  1. Key Parity between `frontend/i18n/en.json` and `frontend/i18n/hi.json`.
  2. Non-empty string values.
  3. Placeholder preservation (`{day}`, `{date}`, `{month}`, `{time}`).
  4. Latin text whitelist (strictly bounded to approved technical acronyms: `ORS`, `CC`, `BY`, `OPEN-METEO.COM`, `IST`).
  5. Lossless UTF-8 round-trip for WhatsApp bulletin text and complex Devanagari conjuncts (`ग्रीष्म`, `प्याऊ`, `श्रमिकों`, `झुग्गी`, etc.).
  6. Bulletins scenario assertions for right-now tier, planning level, 72h peak, and future-aligned deadlines.

### C. Stronger Browser Viewport Layout Checks (`python tests/run-browser-checks.py`)
- **Architecture**: Headless Chromium automation via native Microsoft Edge binary (`msedge.exe` with `--headless --dump-dom --screenshot`).
- **Zero Third-Party Bundles**: Pure Python 3 standard library (`subprocess`, `urllib.request`, `html.parser`, `json`, `re`). No `node_modules` or Playwright/Selenium browser driver installations required.
- **Viewports Tested**:
  - Mobile: `360px`
  - Tablet: `768px`
  - Desktop: `1280px`
- **Assertions**:
  - `scrollWidth <= clientWidth` (zero horizontal overflow).
  - No button or input bounding box overflows its card container.
  - Zero visible `"--"` or `"Loading..."` placeholder text after data hydration.
  - Right-now risk tier and peak 72h risk tier exactly match the live API JSON payload.
  - Assessment timestamp and peak window times explicitly display Indian Standard Time (`IST`).
  - Rendered action count strictly matches backend response.

---

## 2. Dependencies & Clean Repository Hygiene

- **No node_modules**: Testing relies purely on standard Node.js and Python runtimes available on developer/CI environments.
- **No Browser Binaries**: Leverages the system's pre-installed Edge browser binary directly via CLI flags.
- **Coverage in `.gitignore`**: All temporary test artifacts (`scratch/`, logs, SAM build artifacts) are ignored. Zero binaries or dependencies are tracked in Git.
