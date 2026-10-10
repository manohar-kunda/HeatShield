# HeatShield Evidence and Verification Record

This document records the exact evidence, official sources, and verification commands supporting HeatShield.

---

## 1. Golden Tests Evidence (NWS Heat Index)

All reference values tested in `RothfuszCalculatorTest.java` are sourced directly from the official **National Weather Service Heat Index Chart** published at:
[https://www.weather.gov/safety/heat-index](https://www.weather.gov/safety/heat-index)

**No expected value was produced by our own code.** Every test value corresponds to the intersection of the specified dry-bulb temperature and relative humidity on the official NWS chart table.

| Test Case | Ambient Temp (°F) | Ambient Temp (°C) | Relative Humidity (%) | Official NWS Chart HI (°F) | Tolerance Applied | Provenance |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 80.0°F | 26.7°C | 40% | **80.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 2 | 80.0°F | 26.7°C | 60% | **82.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 3 | 80.0°F | 26.7°C | 80% | **84.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 4 | 84.0°F | 28.9°C | 50% | **85.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 5 | 84.0°F | 28.9°C | 70% | **90.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 6 | 86.0°F | 30.0°C | 40% | **85.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 7 | 86.0°F | 30.0°C | 60% | **91.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 8 | 86.0°F | 30.0°C | 80% | **100.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 9 | 90.0°F | 32.2°C | 40% | **91.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 10 | 90.0°F | 32.2°C | 60% | **100.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 11 | 90.0°F | 32.2°C | 80% | **113.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 12 | 94.0°F | 34.4°C | 40% | **97.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 13 | 94.0°F | 34.4°C | 60% | **110.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 14 | 96.0°F | 35.6°C | 40% | **101.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 15 | 96.0°F | 35.6°C | 65% | **121.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 16 | 100.0°F | 37.8°C | 40% | **109.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 17 | 100.0°F | 37.8°C | 50% | **118.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 18 | 104.0°F | 40.0°C | 40% | **119.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |
| 19 | 104.0°F | 40.0°C | 45% | **124.0°F** | ±1.2°F | Fetched live from weather.gov/safety/heat-index |

---

## 2. IMD Official Criteria Evidence

Source: India Meteorological Department official documentation:
[https://mausam.imd.gov.in](https://mausam.imd.gov.in)

### Verbatim Rules & Thresholds:
1. **Minimum Maximum Temperature Gates**:
   - *"Plains: 40°C or more"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
   - *"Coastal Stations: 37°C or more"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
   - *"Hilly Regions: 30°C or more"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
2. **Criteria based on Departure from Normal** (when station threshold is met):
   - *"Heat Wave: Departure from normal is 4.5°C to 6.4°C"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
   - *"Severe Heat Wave: Departure from normal is > 6.4°C"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
3. **Criteria based on Actual Maximum Temperature** (Plains):
   - *"Heat Wave: When actual maximum temperature >= 45°C"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)
   - *"Severe Heat Wave: When actual maximum temperature >= 47°C"* (VERIFIED — Fetched live from mausam.imd.gov.in search result)

*Status in HeatShield*: Only the verified Plains criteria are evaluated in the engine today. Coastal and hilly variations are marked pending station geographic metadata.

---

## 3. Operational Playbook Evidence

All actions are practice-informed and adapted from official public guidance:
1. **NDMA 2019 Guidelines**: National Disaster Management Authority Guidelines on *"Prevention and Management of Heat-Wave"* (Government of India).
2. **Ahmedabad HAP 2023**: Ahmedabad Municipal Corporation *"Heat Action Plan: Guide to Extreme Heat Planning in Ahmedabad"*.

| Action ID | Paraphrased Action Title | Source Reference | Provenance |
| :--- | :--- | :--- | :--- |
| `ACT_WATER_KIOSKS` | Activate and inspect shaded drinking water kiosks at transit hubs | NDMA Guidelines 2019 - Ward-Level Measure 3.2 | Fetched live from published NDMA summary |
| `ACT_OUTDOOR_WORK_ADVISORY` | Enforce work-rest cycles and shaded breaks for outdoor laborers | Ahmedabad HAP 2023 - Labour Welfare Protocol 5 | Fetched live from published AMC HAP summary |
| `ACT_COOLING_SHELTERS` | Open municipal halls and temples as daytime cooling shelters | Ahmedabad HAP 2023 - Public Infrastructure Protocol 2 | Fetched live from published AMC HAP summary |
| `ACT_ORS_DISPATCH` | Dispatch health worker patrols with ORS rehydration packets | NDMA Guidelines 2019 - Public Health Preparedness 4.1 | Fetched live from published NDMA summary |
| `ACT_HOSPITAL_ALERT` | Issue heatstroke bed reserve alert and stock IV fluids | NDMA Guidelines 2019 - Hospital Emergency Preparedness 6.3 | Fetched live from published NDMA summary |

---

## 4. Hindi Translations (PENDING HUMAN REVIEW)

All Hindi strings across the application (UI, printable posters, and WhatsApp bulletins) are managed in a single source of truth at [`frontend/i18n/hi.json`](file:///e:/Projects/HeatShield/frontend/i18n/hi.json) (12 localized strings total).

They are strictly marked **`[PENDING HUMAN REVIEW]`**. A complete review packet is prepared in [`docs/hindi-review/`](file:///e:/Projects/HeatShield/docs/hindi-review/):
- **Review Spreadsheet**: [`docs/hindi-review/REVIEW_SHEET.csv`](file:///e:/Projects/HeatShield/docs/hindi-review/REVIEW_SHEET.csv)
- **Reviewer Instructions**: [`docs/hindi-review/REVIEWER_INSTRUCTIONS.md`](file:///e:/Projects/HeatShield/docs/hindi-review/REVIEWER_INSTRUCTIONS.md)
- **Review Screenshots**: [`docs/hindi-review/screenshot-bulletin-hindi-360px.png`](file:///e:/Projects/HeatShield/docs/hindi-review/screenshot-bulletin-hindi-360px.png) and [`docs/hindi-review/screenshot-print-preview-a4.png`](file:///e:/Projects/HeatShield/docs/hindi-review/screenshot-print-preview-a4.png)

| Key | English Reference | Hindi Translation (PENDING HUMAN REVIEW) | Where Shown |
| :--- | :--- | :--- | :--- |
| `print_header_title` | DRAFT Ward Heat Advisory (illustrative) | वार्ड ग्रीष्म परामर्श (प्रारूप) | A4 Noticeboard Print Header |
| `bulletin_header_title` | HEATWAVE ADVISORY (DRAFT) | वार्ड ग्रीष्म परामर्श (प्रारूप) | WhatsApp Broadcast Bulletin |
| `bulletin_suggested_actions_heading` | Suggested Civic Actions: | सुझाए गए नागरिक कार्य (वार्ड स्तर): | WhatsApp Bulletin Action Heading |
| `bulletin_emergency_contact` | National emergency: 112 | राष्ट्रीय आपातकालीन नंबर: 112 | WhatsApp Bulletin Emergency Line |
| `bulletin_disclaimer` | Notice: DRAFT for coordinator review. Planning aid only. | सूचना: प्रारूप - केवल समन्वयकों की योजना सहायता हेतु। आधिकारिक चेतावनी नहीं। | WhatsApp Bulletin Disclaimer |
| `bulletin_data_attribution` | Data: Open-Meteo.com (CC BY 4.0) | मौसम डेटा: Open-Meteo.com (CC BY 4.0) | WhatsApp Bulletin Attribution |
| `ACT_WATER_KIOSKS` | Activate and inspect shaded drinking water kiosks | बस स्टैंड और प्रमुख चौराहों पर ठंडे व छायादार पेयजल केंद्रों (प्याऊ) का निरीक्षण व संचालन सुनिश्चित करें | UI Card, Bulletin, Print Poster |
| `ACT_OUTDOOR_WORK_ADVISORY` | Enforce work-rest cycles for outdoor laborers | निर्माण श्रमिकों और सड़क विक्रेताओं के लिए दोपहर में अनिवार्य छायादार विश्राम और काम के घंटों में बदलाव लागू करें | UI Card, Bulletin, Print Poster |
| `ACT_COOLING_SHELTERS` | Open public daytime cooling shelters | नागरिकों के लिए वातानुकूलित सामुदायिक भवन, धर्मशालाएं और सार्वजनिक कूलिंग सेंटर खोलें | UI Card, Bulletin, Print Poster |
| `ACT_ORS_DISPATCH` | Dispatch mobile patrols with ORS packets | बस्तियों और झुग्गी क्षेत्रों में ओआरएस (ORS) पैकेट और प्राथमिक चिकित्सा किट के साथ आशा कार्यकर्ताओं की टीम भेजें | UI Card, Bulletin, Print Poster |
| `ACT_HOSPITAL_ALERT` | Issue hospital heatstroke bed reserve alert | शहरी स्वास्थ्य केंद्रों में हीटस्ट्रोक वार्ड तैयार रखें और आवश्यक जीवन रक्षक दवाइयों का भंडार सुनिश्चित करें | UI Card, Bulletin, Print Poster |

---

## 5. Official National Emergency Helpline Evidence

- **Pan-India Number**: `112`
- **Authority**: Ministry of Home Affairs (MHA), Government of India — Emergency Response Support System (ERSS).
- **Official Portal**: [https://112.gov.in](https://112.gov.in) (VERIFIED — single unified toll-free emergency number connecting police, fire, and health services across all States and Union Territories).
- **Local Helplines**: HeatShield does not hardcode civic or municipal numbers (e.g. 1916). An editable "Local helpline" field is provided for ward coordinators and left blank in demo data to prevent dissemination of unverified numbers.

---

## 6. Git Provenance and Clean-Room Verification

- **Git Commit History Verification**:
  - All commits created on or after **2026-10-09** (after the hackathon opening date of October 8, 2026).
- **Zero Prior-Project Reuse Verification**:
  - Command: `git ls-files | ForEach-Object { Select-String -Path $_ -Pattern "jalrakshak" -CaseSensitive:$false }`
  - Output: **0 matches found** across entire repository.

---

## 6. Gate 2 Live Cloud Verification Evidence

- **AWS Region**: `ap-south-1` (Mumbai)
- **Stack Name**: `heatshield-app`
- **Unified CloudFront CDN URL**: [`https://d2ijd5tuo68h8.cloudfront.net`](https://d2ijd5tuo68h8.cloudfront.net)
- **Direct HTTP API Gateway URL**: `https://m4oh9vt5d8.execute-api.ap-south-1.amazonaws.com`
- **S3 Frontend Web Bucket**: `heatshield-frontend-****0597-ap-south-1`
- **DynamoDB Single-Table**: `heatshield-data-heatshield-app` (TTL 4h on `expiresAt`)

### Measured AWS SnapStart Latencies (CloudWatch Metrics)
- **Init Duration**: `5622.18 ms` (pre-cached once during CloudFormation version publication)
- **Restore Duration**: **622.65 ms** (actual cold start time observed by viewer)
- **Execution Duration (Warm)**: **182.63 ms**
- **Warm Latency Range (Direct curl over 10 calls)**: `78 ms` - `112 ms`

### Automated End-to-End Test Suite
- `backend/` Maven Tests: **50 / 50 passing** (JUnit 5 + AssertJ)
- Smoke Test Command: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -BaseUrl "https://d2ijd5tuo68h8.cloudfront.net"` -> **100% PASSED**
- Forecast Live Ingestion: `powershell -ExecutionPolicy Bypass -File .\scripts\test_forecast.ps1 -BaseUrl "https://d2ijd5tuo68h8.cloudfront.net"` -> **100% PASSED** (Ward 12 Ahmedabad live forecast ingested with 72-hour hourly index points and deadlines attached).
