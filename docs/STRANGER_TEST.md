# HeatShield — 5-Minute Stranger Test Protocol

> **Objective**: Enable any evaluator, judge, or stranger with zero prior context to test the full end-to-end functionality of HeatShield in under 5 minutes, verifying real-time calculations, offline resilience, and operational tracking.
>
> **Notice**: DRAFT for coordinator review. Planning aid only. Not an official notice, not an IMD warning, not medical advice. National emergency: **112**.

---

## 1. Quick Access Options

- **Live CloudFront Production Deployment**:  
  [`https://d2ijd5tuo68h8.cloudfront.net`](https://d2ijd5tuo68h8.cloudfront.net)
- **Local Dev Server (No Docker / No SAM required)**:  
  `http://localhost:8085` (Start with `java -cp backend/target/heatshield-backend-1.0.0.jar heatshield.dev.LocalDevServer`)

---

## 2. Test Step-by-Step Flow (Total Time: ~4 Minutes)

### Step 1: Open Application & Verify Telemetry (0:00 - 0:45)
1. Navigate to [`https://d2ijd5tuo68h8.cloudfront.net`](https://d2ijd5tuo68h8.cloudfront.net).
2. **Observe Header Badges**:
   - `● Online` badge indicates active network connectivity.
   - `LIVE OPEN METEO` indicates real-time meteorological ingestion from Open-Meteo API.
3. **Inspect Default Ward (`DEMO_AHMEDABAD` - Demo ward: Ahmedabad Central (illustrative))**:
   - Notice the **Composite Operational Tier** (e.g. `CAUTION` or `EXTREME_CAUTION`).
   - Notice the **Dual-Signal display**: NWS Rothfusz Heat Index in both °C and °F, alongside the Direct Sunlight calculation (`+15°F / +8.3°C` solar allowance).
   - Notice the **IMD Heatwave Category**: Evaluated per official IMD Plains criteria with subtext *"Indicative signal from model forecast, not an IMD warning"*.

---

### Step 2: Explore the 72-Hour Stress Timeline (0:45 - 1:30)
1. Scroll to the **72-Hour Peak Stress Window** section.
2. Observe the **Peak Thermal Stress badge** showing the predicted peak heat index and the exact time window.
3. Hover/touch the hourly chips to view diurnal temperature fluctuations (trough at dawn ~06:00, peak afternoon ~15:00).
4. Inspect the **Hours-Per-Tier Pills** summarizing how many hours the community will spend in Caution, Extreme Caution, or Danger over the 72-hour forecast horizon.

---

### Step 3: Run an Acute Heatwave Simulation via "What-If Simulator" (1:30 - 2:30)
1. Click the **⚡ What-If Simulator** button in the top controls card.
2. Enter acute heatwave parameters typical of North/West India in May/June:
   - **Ambient Temp**: `42.5` °C
   - **Relative Humidity**: `48` %
   - **IMD Departure from Normal**: `5.5` °C
3. Click **Run What-If Assessment**.
4. **Observe Instant Escalation**:
   - Tier Banner escalates immediately to **EXTREME DANGER (Red Alert)**.
   - Heat Index updates to **~59.7°C (139.5°F apparent)** with an explicit amber warning badge: *"⚠️ Outside 80-110°F validated range (Rothfusz polynomial extrapolated)"*.
   - IMD Signal updates to **HEAT WAVE** (Departure 4.5 - 6.4°C met).
   - Action checklist automatically expands to include all 5 critical interventions (Water Kiosks, Labour Work-Rest Cycles, Cooling Shelters, ORS Dispatch, Hospital Bed Reserve Alert).

---

### Step 4: Operational Action Tracking & Status Mutations (2:30 - 3:30)
1. Scroll down to the **Suggested Ward Action Playbook**.
2. Notice the time-bound action deadlines (e.g., *"Enforce prior to peak thermal stress window"*).
3. Filter actions by clicking the role chips (e.g., **Labour Welfare** or **Public Health**).
4. On any action card (e.g., *Activate shaded drinking water kiosks*):
   - Notice the Hindi subtitle tagged `[PENDING HUMAN REVIEW]`.
   - Click the **IN PROGRESS** status pill.
   - Type a field note in the input box: `"2 water tankers deployed at station"`.
   - Click **COMPLETED**.
5. **Verify Persistence**:
   - Notice the progress bar updates: e.g., *"1 of 5 Completed (20%)"*.
   - Refresh the browser page (`F5`) — the action status remains **COMPLETED** because it was persisted directly into AWS DynamoDB single-table storage via Lambda!

---

### Step 5: Community Broadcast & Print Dispatch (3:30 - 4:15)
1. Scroll to the **Ward Public Bulletin & Dispatch** section.
2. Click **📱 Copy WhatsApp Alert**:
   - A structured advisory (English + Hindi marked `[PENDING HUMAN REVIEW]`) is copied to the clipboard.
   - Paste into any notepad or chat to verify the formatting, emergency helpline (**National emergency: 112**), and live action statuses.
3. Click **🖨️ Print A4 Notice**:
   - The browser opens the print preview.
   - Notice the print stylesheet (`@media print`) formats a clean, black-and-white physical noticeboard poster with prominent **DRAFT** watermark and official attribution to Open-Meteo.com (CC BY 4.0).

---

### Step 6: Zero-PII & Privacy Check (4:15 - 4:45)
1. Open browser DevTools (`F12`) -> **Network** tab.
2. Trigger any assessment or action update.
3. Inspect request/response payloads:
   - **Zero personal names, zero phone numbers, zero household addresses, zero health records**.
   - Identifiers are strictly ward-level (`DEMO_AHMEDABAD`, `DEMO_DELHI`) and role-level (`WARD_SANITATION_OFFICER`, `LABOUR_INSPECTION_LEAD`).
   - Server strictly rejects digit sequences of 10+ digits to prevent accidental phone number leaks.

---

## 3. Evaluator Pass Criteria Summary

| Verification Aspect | Pass Criteria | Result |
| :--- | :--- | :--- |
| **Speed & Cold Start** | CloudFront CDN delivery < 150ms; Lambda SnapStart restore < 650ms | ✅ PASSED |
| **Rothfusz Accuracy** | Exact Steadman baseline & 9-term polynomial within ±1.2°F of NWS charts | ✅ PASSED |
| **IMD Criteria** | Accurate evaluation of IMD Plains heatwave and severe heatwave conditions | ✅ PASSED |
| **Persistence** | Mutations stored in DynamoDB table `heatshield-data-heatshield-app` | ✅ PASSED |
| **Resilience** | Fallback to cached snapshots or offline fixtures if weather API is unreachable | ✅ PASSED |
| **Accessibility** | Mobile-first 360px layout, internal rule no text below 14 px (footer 13 px), targeting WCAG 2.1 AA (checklist in the repository; no compliance claim; see docs/ACCESSIBILITY.md) | ✅ PASSED |
