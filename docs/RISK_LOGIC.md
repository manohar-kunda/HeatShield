# HeatShield Operational Risk Logic Specification

> **Status**: APPROVED ARCHITECTURAL SPECIFICATION  
> **References**:  
> - NOAA / NWS Rothfusz Heat Index Regression (1990) & Steadman (1979)  
> - India Meteorological Department (IMD) Heat Wave Criteria (mausam.imd.gov.in)  
> - National Disaster Management Authority (NDMA) Guidelines on Heat-Wave Management (2019)  
> - Ahmedabad Municipal Corporation Heat Action Plan (AMC HAP 2023)

---

## 1. The Core Problem: Why Current-Hour Triggering Fails

In standard weather dashboards, alerts reflect the **current instantaneous temperature** (e.g. 27°C at 06:00 AM).

Under a naive implementation:
- At 06:00 AM, the ambient heat index is `BELOW_THRESHOLD` or `CAUTION`.
- As a result, only baseline actions (or no actions) are triggered.
- By 12:30 PM, when temperatures cross 42°C (`DANGER` / `EXTREME_DANGER`), the alert triggers in real-time.
- **However, lead time has expired**: outdoor workers are already exposed to direct sunlight, drinking water tankers have not been mobilized, and hospital beds are unreserved.

Per NDMA Guidelines (Measure 3.2 & Public Health Preparedness 4.1), **preventative interventions require operational lead time** (4 to 18 hours).

---

## 2. The 72-Hour Peak Composite Tier Rule

To solve this, HeatShield enforces the **72-Hour Peak Composite Tier Rule**:

$$\text{Tier}_{\text{operational}} = \max_{t \in [t_0, t_0 + 72\text{h}]} \left( \text{CompositeTier}\left(\text{NWS\_HI}(T_t, \text{RH}_t), \text{IMD\_Category}(T_t, \Delta T_t)\right) \right)$$

### Step-by-Step Evaluation Procedure:
1. **Hourly Ingestion**: Ingest hourly dry-bulb temperature ($T_t$) and relative humidity ($\text{RH}_t$) across the 72-hour forecast horizon from Open-Meteo in Indian Standard Time (`Asia/Kolkata`).
2. **Hourly NWS Rothfusz Calculation**:
   - Evaluate Steadman's simple formula.
   - If $\text{HI} \ge 80.0^\circ\text{F}$, evaluate Rothfusz 9-term regression polynomial with low-RH and high-RH adjustments.
   - Map to half-open NWS intervals:
     - $<80.0^\circ\text{F}$ $\rightarrow$ `BELOW_THRESHOLD`
     - $[80.0, 90.0^\circ\text{F})$ $\rightarrow$ `CAUTION`
     - $[90.0, 103.0^\circ\text{F})$ $\rightarrow$ `EXTREME_CAUTION`
     - $[103.0, 125.0^\circ\text{F})$ $\rightarrow$ `DANGER`
     - $\ge 125.0^\circ\text{F}$ $\rightarrow$ `EXTREME_DANGER`
3. **Hourly IMD Plains Signal Evaluation**:
   - Normal: $T_t < 40.0^\circ\text{C}$ or (if $T_t \ge 40.0^\circ\text{C}$, $\Delta T_t < 4.5^\circ\text{C}$ and $T_t < 45.0^\circ\text{C}$).
   - Heat Wave: $T_t \ge 40.0^\circ\text{C}$ and ($\Delta T_t \in [4.5, 6.4^\circ\text{C}]$ or $T_t \ge 45.0^\circ\text{C}$).
   - Severe Heat Wave: $T_t \ge 40.0^\circ\text{C}$ and ($\Delta T_t > 6.4^\circ\text{C}$ or $T_t \ge 47.0^\circ\text{C}$).
4. **Hourly Composite Tiering**:
   - If IMD is `SEVERE_HEAT_WAVE`, elevate to at least `DANGER`.
   - If IMD is `HEAT_WAVE`, elevate to at least `EXTREME_CAUTION`.
   - Otherwise, retain the NWS tier.
5. **Operational Playbook Activation**:
   - The **operational tier** for action generation is set to the **maximum composite tier across all 72 hours**.
   - Current ambient conditions and current-hour heat index are presented for situational awareness, but the **action checklist is pre-activated for the forecast peak**.

---

## 3. Playbook Action Escalation Matrix

Actions are cumulative (each tier inherits and builds upon lower tiers):

| Operational Tier | Trigger Threshold (Peak) | Playbook Actions Activated |
| :--- | :--- | :--- |
| **BELOW_THRESHOLD** | Apparent $< 80.0^\circ\text{F}$ | Routine surveillance (0 proactive actions). |
| **CAUTION** | Apparent $80.0 - 89.9^\circ\text{F}$ | `ACT_WATER_KIOSKS` (1 action). |
| **EXTREME_CAUTION** | Apparent $90.0 - 102.9^\circ\text{F}$ (or IMD Heat Wave) | `ACT_WATER_KIOSKS` + `ACT_OUTDOOR_WORK_ADVISORY` (2 actions). |
| **DANGER** | Apparent $103.0 - 124.9^\circ\text{F}$ (or IMD Severe Heat Wave) | `ACT_WATER_KIOSKS` + `ACT_OUTDOOR_WORK_ADVISORY` + `ACT_COOLING_SHELTERS` + `ACT_ORS_DISPATCH` (4 actions). |
| **EXTREME_DANGER** | Apparent $\ge 125.0^\circ\text{F}$ | All 5 actions activated including `ACT_HOSPITAL_ALERT`. |

---

## 4. Time-Bound Deadlines (Indian Standard Time)

All deadlines are calculated relative to `ZoneId.of("Asia/Kolkata")`:
- `BEFORE_10_AM`: If current IST $< 10:00$, due `"Today, <Date>, before 10:00 AM"`; otherwise `"Tomorrow, <Date>, before 10:00 AM"`.
- `BEFORE_11_AM`: If current IST $< 11:00$, due `"Today, <Date>, before 11:00 AM"`; otherwise `"Tomorrow, <Date>, before 11:00 AM"`.
- `PEAK_HOURS_12_TO_16`: Tied to peak thermal window; due `"Today/Tomorrow, <Date>, before peak hours (12:00 - 04:00 PM)"`.
- `IMMEDIATE`: Due `"Immediate (< 30 mins from <CurrentTime>)"`.
