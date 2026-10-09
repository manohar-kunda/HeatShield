# ADR-002: Heat-Risk Calculation Methodology, Verification, and Disclaimers

- **Status**: Approved
- **Date**: 2026-10-09
- **Decision Owner**: Senior Java/AWS Architect & Ward Relief Engineer

## 1. Context and Problem Statement
Heatwave operational planning requires converting ambient temperature ($T$) and relative humidity ($RH$) into apparent thermal stress indicators that trigger protective community actions.
Arbitrary formulas or ungrounded machine-learning models risk either false alarms (wasting relief resources) or deadly under-estimations.

## 2. Decision

### Primary Signal: Official NOAA/NWS Rothfusz Heat Index
We implement the exact multi-stage algorithm documented by the US National Weather Service (NWS) and Lans P. Rothfusz (1990) (`weather.gov/safety/heat-index`):

1. **Step 1: Steadman Simpler Formula**:
   $$\text{HI}_{\text{simple}} = 0.5 \times (T + 61.0 + ((T - 68.0) \times 1.2) + (RH \times 0.094))$$
2. **Step 2: Pre-check & Averaging**:
   $$\text{Avg} = \frac{\text{HI}_{\text{simple}} + T}{2}$$
   - If $\text{Avg} < 80.0^\circ\text{F}$ ($26.7^\circ\text{C}$), then $\text{HI} = \text{HI}_{\text{simple}}$.
3. **Step 3: Rothfusz Full Regression** (if $\text{Avg} \ge 80.0^\circ\text{F}$):
   $$\begin{aligned}
   \text{HI} = &-42.379 + 2.04901523\,T + 10.14333127\,RH - 0.22475541\,T\,RH \\
   &- 0.00683783\,T^2 - 0.05481717\,RH^2 + 0.00122874\,T^2\,RH \\
   &+ 0.00085282\,T\,RH^2 - 0.00000199\,T^2\,RH^2
   \end{aligned}$$
4. **Step 4: Humidity Adjustments**:
   - **Low RH Adjustment**: If $RH < 13\%$ and $80^\circ\text{F} \le T \le 112^\circ\text{F}$:
     $$\text{Adjustment} = -\left[\frac{13 - RH}{4}\right] \times \sqrt{\frac{17 - |T - 95.0|}{17.0}}$$
     $$\text{HI} = \text{HI} + \text{Adjustment}$$
   - **High RH Adjustment**: If $RH > 85\%$ and $80^\circ\text{F} \le T \le 87^\circ\text{F}$:
     $$\text{Adjustment} = +\left[\frac{RH - 85}{10}\right] \times \left[\frac{87.0 - T}{5.0}\right]$$
     $$\text{HI} = \text{HI} + \text{Adjustment}$$

### Official NWS Contiguous Half-Open Risk Tiers
Rounding Rule: Mathematical round-half-up to nearest integer $^\circ\text{F}$ before tier evaluation, and converted to $^\circ\text{C}$ for display ($^\circ\text{C} = (^\circ\text{F} - 32) \times 5 / 9$):

| Tier Key | Interval in $^\circ\text{F}$ | Equivalent Approx in $^\circ\text{C}$ | Official Operational Meaning |
| :--- | :--- | :--- | :--- |
| `BELOW_THRESHOLD` | $\text{HI} < 80.0^\circ\text{F}$ | $< 26.7^\circ\text{C}$ | Normal baseline conditions. |
| `CAUTION` | $80.0^\circ\text{F} \le \text{HI} < 90.0^\circ\text{F}$ | $26.7^\circ\text{C} \le \text{HI} < 32.2^\circ\text{C}$ | Fatigue possible with prolonged exposure/activity. |
| `EXTREME_CAUTION` | $90.0^\circ\text{F} \le \text{HI} < 103.0^\circ\text{F}$ | $32.2^\circ\text{C} \le \text{HI} < 39.4^\circ\text{C}$ | Sunstroke, heat cramps, and heat exhaustion possible. |
| `DANGER` | $103.0^\circ\text{F} \le \text{HI} < 125.0^\circ\text{F}$ | $39.4^\circ\text{C} \le \text{HI} < 51.7^\circ\text{C}$ | Heat cramps/exhaustion likely; heatstroke possible. |
| `EXTREME_DANGER` | $\text{HI} \ge 125.0^\circ\text{F}$ | $\ge 51.7^\circ\text{C}$ | Heatstroke highly likely with continued exposure. |

### Validity & Extrapolation Caveat
- The regression model is empirically verified between $80^\circ\text{F} - 110^\circ\text{F}$ ($26.7^\circ\text{C} - 43.3^\circ\text{C}$) and $40\% - 100\%$ relative humidity.
- For inputs exceeding $110^\circ\text{F}$ ($43.3^\circ\text{C}$), the calculated value is flagged in the response: `extrapolated = true` (*"Value falls outside standard NWS empirical validation chart; treat with heightened caution"*).

### Direct Sunlight Offset
The formula assumes shady conditions and light winds. HeatShield explicitly reports:
$$\text{Sun Exposure Apparent Temperature} = \text{HI} + 15^\circ\text{F}\quad (+8.3^\circ\text{C})$$

### Secondary Regional Signal: India Meteorological Department (IMD) Absolute Gates
Verified from official IMD criteria (`mausam.imd.gov.in`):
1. **Plains minimum gate**: $T_{\text{max}} \ge 40.0^\circ\text{C}$.
   - Absolute Heatwave: $T_{\text{max}} \ge 45.0^\circ\text{C}$.
   - Absolute Severe Heatwave: $T_{\text{max}} \ge 47.0^\circ\text{C}$.
2. **Coastal minimum gate**: $T_{\text{max}} \ge 37.0^\circ\text{C}$.
3. **Hilly minimum gate**: $T_{\text{max}} \ge 30.0^\circ\text{C}$.
- **Departure from normal**: (When entered by coordinator from official IMD bulletin):
  - Normal Heatwave: $+4.5^\circ\text{C}$ to $+6.4^\circ\text{C}$.
  - Severe Heatwave: $> +6.4^\circ\text{C}$.
- **Operational Composite Level**: The system computes both signals and sets the final operational tier to `MAX(NWS_Tier, IMD_Tier)`.

## 3. Transparency & Disclaimers
HeatShield presents all calculations with zero black boxes:
> **Notice**: HeatShield provides environmental planning and operational risk indicators. It is not an individual medical diagnostic tool or personal health advisory. Always adhere to official bulletins from the India Meteorological Department and local disaster management authorities.
