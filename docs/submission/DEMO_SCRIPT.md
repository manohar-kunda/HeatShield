# HeatShield — 3-Minute Demo Video Script (v2)

**Target Video Duration**: 2 minutes 45 seconds (165 seconds)  
**Tone**: Crisp, professional, technical yet civic-focused  
**Target Audience**: Hackathon judges, AWS architects, municipal disaster coordinators  

---

### [00:00 - 00:30] Scene 1: The Problem & The Lead Time Gap
- **Visual**: Screen recording showing standard weather app displaying "Ahmedabad: 28°C at 7:00 AM — No Alert".
- **Narration**:  
  *"During Indian heatwaves, temperatures easily breach 42°C. But standard weather dashboards only tell you the current temperature. When an alert fires at noon, the damage is already done: outdoor laborers have been exposed to sunlight, water kiosks are unstaffed, and hospital beds are unreserved. Preventative civic action requires advance operational lead time before peak midday heat sets in. That’s why we built HeatShield."*

---

### [00:30 - 01:10] Scene 2: Live System & Peak Risk Logic
- **Visual**: Switch to HeatShield live URL (`https://d2ijd5tuo68h8.cloudfront.net`). Select "Demo ward: Ahmedabad Central". Show the 72-Hour continuous timeline.
- **Narration**:  
  *"HeatShield is a rule-backed Heatwave Risk-to-Action Planner live in AWS ap-south-1. Notice what happens: even though current morning conditions might be mild, HeatShield scans the entire 72-hour forecast horizon from Open-Meteo in Indian Standard Time.  
  It calculates both the NOAA/NWS Rothfusz 9-term polynomial heat index and the IMD Plains criteria. Under our 72-Hour Peak Composite Tier Rule, actions are triggered by the forecast peak—activating the emergency playbook in advance and giving field teams time to mobilize."*

---

### [01:10 - 01:50] Scene 3: Action Tracking & Privacy Controls
- **Visual**: Scroll to "Suggested Ward Action Playbook". Toggle "ACT_WATER_KIOSKS" to "IN_PROGRESS", then "COMPLETED". Type a field note: *"3 tankers deployed at station hub"*. Attempt to type a 10-digit number and show the privacy rejection. Show the "Reset Demo" button.
- **Narration**:  
  *"Playbooks are mapped directly from NDMA and Ahmedabad Heat Action Plan guidelines. Each task has a clear municipal role, target demographic, and time-bound deadline in IST.  
  Field coordinators can track task progress in real time. We strictly enforce zero PII—the system rejects phone numbers and personal identities in field notes. Unique workspace IDs ensure demo testing is completely isolated without cross-user interference, and demo state can be reset in one click."*

---

### [01:50 - 02:20] Scene 4: What-If Simulator & Historical Replay
- **Visual**: Click "⚡ What-If Simulator". Dial temperature to 44°C and 45% humidity. Then switch ward dropdown to "Historical Replay: Ahmedabad May 2010 Severe Heatwave".
- **Narration**:  
  *"Coordinators don't have to wait for an actual disaster to prepare. Using the What-If Simulator, teams can test microclimate scenarios. Or they can load our Historical Replay mode—replaying the benchmark May 2010 Ahmedabad heatwave episode with both observed station data and reanalysis grid values to stress-test municipal resource allocation."*

---

### [02:20 - 02:45] Scene 5: AWS Architecture & Performance
- **Visual**: Quick transition to AWS architecture diagram / terminal showing smoke tests passing. Show the WhatsApp broadcast copy and print bulletin view with QR code.
- **Narration**:  
  *"Under the hood, HeatShield uses Java 21 with AWS Lambda SnapStart for low warm handler execution, Amazon CloudFront with Origin Access Control for edge caching across India, and DynamoDB On-Demand with 7-day TTL for zero idle cost. The entire frontend is vanilla PWA under [FRONTEND_BUNDLE_KB] KB, with offline caching and background sync.  
  HeatShield turns raw weather data into immediate, transparent civic action."*
