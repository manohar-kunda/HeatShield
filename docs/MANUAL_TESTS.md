# HeatShield Manual Testing Guide & Walkthrough Protocols

> **Status**: APPROVED TEST SPECIFICATION  
> **Target Deployment**: `https://d2ijd5tuo68h8.cloudfront.net`  
> **Reference Version**: Build `v10` (`heatshield-v10`)

This document defines the exact step-by-step verification protocols for interactive client-side operations that cannot be fully evaluated via static headless CLI DOM inspection.

---

## 1. Action Status Toggle

**Objective**: Verify that toggling municipal action status updates local UI progress, updates the progress bar, and sends an authenticated PATCH to DynamoDB.

**Steps**:
1. Open `https://d2ijd5tuo68h8.cloudfront.net` in any modern browser.
2. Under **Suggested Ward Action Playbook**, locate Action 1 (`ACT_WATER_KIOSKS`).
3. Note the initial progress bar state (e.g. `0 of 2 actions done`, fill `0%`).
4. Click the status button **IN PROGRESS**.
   - *Expected Result*: Button changes background to amber/active; status badge updates to `IN PROGRESS`.
5. Click the status button **DONE**.
   - *Expected Result*: Button changes background to emerald/active; status badge updates to `DONE`; progress bar increments to `1 of 2 actions done` (fill `50%`).
6. Refresh the browser page (`F5` or `Ctrl+R`).
   - *Expected Result*: Action 1 remains in `DONE` status, proving server-side persistence in DynamoDB under the workspace GUID.

---

## 2. Field Coordinator Note Entry & Screen Validation

**Objective**: Verify that short text notes can be entered and persisted, while personal contact details (phone numbers, email addresses) are rejected by the privacy filter.

**Steps**:
1. Locate Action 1's note input field (`Add operational note...`).
2. Type an authorized operational note: `Kiosks 1-4 inspected at station roundabout; water tanker filled.`
3. Press `Tab` or click outside the input (triggering the `blur` event).
   - *Expected Result*: Small green indicator pill displays `"Saved"`.
4. Refresh the browser page (`F5`).
   - *Expected Result*: The saved note text is restored from DynamoDB.
5. In the same field, attempt to input an unauthorized phone number: `Call 9876543210 immediately`.
6. Press `Tab` or click outside the input.
   - *Expected Result*: Red error badge displays rejecting the note; note is not persisted to DynamoDB; server returns HTTP 400 with `REJECTED: Personal phone numbers or email addresses are not permitted in civic notes.`

---

## 3. Clipboard Copy (WhatsApp Bulletin)

**Objective**: Verify that clicking **Copy text** copies the complete bilingual advisory text to the system clipboard without placeholder characters or truncation.

**Steps**:
1. Scroll down to the **Ward Bulletin: copy or print** card.
2. Click the button **Copy text** (or press keyboard shortcut if focused).
3. *Expected Result*:
   - Button text changes from `"Copy text"` to `"Copied!"` for 2 seconds.
   - Accessible announcement region `#copy-announcement` announces `"Advisory bulletin copied to clipboard."`
4. Open a text editor (e.g. Notepad) and press `Ctrl+V`.
5. *Expected Result*:
   - Text begins with `HEATWAVE ADVISORY (DRAFT) - <Ward Name>`.
   - Includes current timestamp in 24-hour IST notation (`Issued: HH:mm IST, DD Mon YYYY`).
   - Contains English section and Hindi section marked `--- वार्ड ग्रीष्म परामर्श (प्रारूप) [PENDING HUMAN REVIEW] ---`.
   - Lists emergency number `112`.
   - Zero occurrences of `AM IST`, `PM IST`, or unresolved placeholders (`{day}`, `{time}`, `--`).

---

## 4. Print Preview (A4 Noticeboard Poster)

**Objective**: Verify that clicking **Print A4 notice** activates high-contrast, monochrome print formatting with DRAFT watermark and zero dark theme artifacts.

**Steps**:
1. On the **Ward Bulletin: copy or print** card, click **Print A4 notice**.
   - *Expected Result*: The browser's native print modal opens.
2. In the print preview window:
   - *Expected Result*:
     - The background is pure white; all navigation, controls, charts, and dark theme elements are hidden (`@media print`).
     - A semi-transparent diagonal watermark reads **DRAFT**.
     - Header reads: `DRAFT Ward Heat Advisory (illustrative)` and `वार्ड ग्रीष्म परामर्श (प्रारूप) [PENDING HUMAN REVIEW]`.
     - Action checklist includes checkboxes and deadlines for municipal workers.
     - Footer contains national emergency number `112` and Open-Meteo CC BY 4.0 attribution.
3. Cancel the print preview modal.
   - *Expected Result*: Application returns to standard daylight view without layout distortion.

---

## 5. Offline Queue & Background Sync

**Objective**: Verify that status updates made while disconnected are queued locally and automatically synchronized with DynamoDB when reconnected.

**Steps**:
1. Open DevTools (`F12`) and switch to the **Network** tab.
2. Select **Offline** from the throttling dropdown.
   - *Expected Result*: The header status pill changes to `Offline (Cached)`.
3. Under **Suggested Ward Action Playbook**, change Action 2 (`ACT_OUTDOOR_WORK_ADVISORY`) status to **DONE**.
   - *Expected Result*: UI immediately updates optimistically (`2 of 2 actions done`); note indicator displays `"Queued (offline)"`.
   - Check `localStorage.getItem('heatshield_offline_queue')` in Console: contains the pending status payload.
4. In DevTools Network tab, switch back to **No throttling** (Online).
   - *Expected Result*:
     - The browser detects the `online` event.
     - Header pill returns to `Live data`.
     - The service worker / client flushes the queue via `PATCH /api/actions`.
     - Note indicator updates to `"Synced"`.
5. Refresh the page online: Action 2 remains `DONE`, confirming successful replay to DynamoDB.

---

## 6. Reset Demo Flow

**Objective**: Verify that clicking **Reset Demo** clears custom statuses, restores initial demo conditions, and generates a fresh workspace isolation ID.

**Steps**:
1. Note the current workspace ID in local storage (`heatshield_workspace_id`).
2. Click the header button **Reset Demo**.
3. *Expected Result*:
   - Browser prompts for confirmation: `"Reset demo data to initial state?"`.
   - Upon confirming, page reloads.
   - A fresh random workspace ID is generated (`ws-...`).
   - Action statuses reset to their default uncompleted state (`0 of 2 actions done`).
   - Local notes and helpline entries are cleared.
