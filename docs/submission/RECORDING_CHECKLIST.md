# 3-Minute Demo Video Recording & Production Checklist

**Event**: Bharat Builds Tour 2026 / Environmental Hacks  
**Project**: HeatShield — Community Heatwave Risk-to-Action Planner  
**Production URL**: https://d2ijd5tuo68h8.cloudfront.net  
**Target Duration**: Exactly 3 minutes (180 seconds maximum)

---

## 1. Pre-Recording Camera & Environment Setup
- **Phone Setup**: Mount mobile device vertically (or record responsive Chrome DevTools at 360px viewport).
- **Network**: Ensure reliable connectivity; live CloudFront delivers assets in <100ms.
- **Data Reality Note**: October in India represents post-monsoon autumn conditions; ambient temperatures in live wards will realistically hover around 29°C–34°C ("Caution" / "Below Threshold" tiers). Acknowledge this upfront and use the Historical Replay or What-If Simulator to show peak emergency tiers.
- **Privacy & Security Blur Rule**: When showing the AWS Management Console, **BLUR OR CROP** the top-right account menu dropdown (never show raw 12-digit AWS account IDs or email addresses).

---

## 2. Exact Sequence of Recording Shots

### Shot 1: Mobile First Walkthrough on Live URL (0:00 - 0:45) [45s]
1. **Screen**: Open `https://d2ijd5tuo68h8.cloudfront.net` on phone/mobile viewport (360px).
2. **Visual Checks**:
   - Point out header with shield icon and truthful status pill: **"Live data"** (green badge).
   - Point out visible operational disclaimer: *"DRAFT for coordinator review. Planning aid only. National emergency: 112"*.
   - Point out Ward Selector defaulted to **Demo ward: Ahmedabad Central (illustrative)**.
   - Point out Right-Now Hazard tier vs Peak 72-Hour Hazard tier (e.g., Caution vs Extreme Caution peak).
   - Scroll down smoothly to show the **Suggested Ward Action Playbook**: show action cards with roles, deadlines, and NDMA references.

### Shot 2: Action Status Tracking & Coordinator Notes (0:45 - 1:15) [30s]
1. Select an action card (e.g. `Activate shaded drinking water kiosks`).
2. Toggle status dropdown from **Pending** to **In progress** (or **Done**).
3. Type an operational note in the note field: `Tanker dispatched to Kalupur transit junction`.
4. Click **Save**: observe the progress bar update (`1 of 2 actions done`).

### Shot 3: Civic Broadcast Bulletin & Print Poster (1:15 - 1:45) [30s]
1. Scroll to the **Ward Public Bulletin & Dispatch** card.
2. Click **Copy text**: show inline announcement *"Copied"* with WhatsApp-ready bulletin text.
3. Show the printable poster preview: click **Print A4 notice**, showing clean monochrome high-contrast emergency layout with bold **DRAFT** watermark and official helpline `112`.

### Shot 4: Historical Heatwave Replay & What-If Simulation (1:45 - 2:15) [30s]
1. Return to the top Controls Card.
2. Under Target Ward, select **REPLAY: Ahmedabad May 2010 Heatwave (Observed Station 46.8°C reported in the AMC Heat Action Plan (page not verified) / Grid 44.2°C)**.
3. Click **Get forecast**: observe instantaneous escalation to **DANGER (Orange Alert)** with 4 prioritized actions.
4. Click **What-if** toggle button: enter simulated extreme conditions (43°C ambient, 50% RH) to show dynamic calculation of **EXTREME DANGER (Red Alert)** with the scientific extrapolation warning flag.

### Shot 5: AWS Architecture & Cloud Console Proof (2:15 - 2:45) [30s]
1. **Screen Switch**: Switch to desktop browser showing AWS Console in `ap-south-1` (Mumbai).
2. **Resources to Show**:
   - **CloudFront Distribution**: Show `d2ijd5tuo68h8.cloudfront.net` status *Enabled* with Origin Access Control.
   - **AWS Lambda Function**: Show `HeatShieldFunction` configured with **Java 21** and **SnapStart enabled** (`ApplyOn: PublishedVersions`). Show CloudWatch execution logs with warm durations under 20ms.
   - **Amazon DynamoDB**: Show single-table `heatshield-data-heatshield-app` with items partitioned by `WS#<workspaceId>#WARD#<wardId>` and automatic 7-day TTL (`expiresAt`).
   - **AWS Budgets**: Show configured budget containment alert ($5.00 threshold).
   - *(Reminder: Keep top-right account dropdown blurred/cropped).*

### Shot 6: Conclusion & Closing Summary (2:45 - 3:00) [15s]
1. Camera on speaker or final dashboard screen.
2. State clean-room engineering: 100% written for Environmental Hacks 2026, targeting WCAG 2.1 AA, serverless in `ap-south-1`.
3. Conclude video.
