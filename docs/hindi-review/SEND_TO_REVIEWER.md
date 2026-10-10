# Hindi Review Packet — Instructions for Reviewers

Thank you for reviewing the Hindi strings for **HeatShield**. To ensure accurate, culturally respectful, and technically valid civic notices across Indian municipal jurisdictions, we use a simple Google Sheets / CSV review sheet.

---

## 1. Opening and Editing in Google Sheets (Recommended)

1. Navigate to [Google Sheets](https://sheets.new) in your web browser.
2. Click **File** -> **Import** -> **Upload**.
3. Drag and drop [`docs/hindi-review/REVIEW_SHEET.csv`](file:///e:/Projects/HeatShield/docs/hindi-review/REVIEW_SHEET.csv).
4. In the import dialog, select **"Replace spreadsheet"** and keep character encoding as **"Detect automatically"** (or **UTF-8**).
5. You will see columns:
   - `key`: Internal identifier (do not modify).
   - `where_shown`: Context in the application (UI, A4 poster, WhatsApp broadcast).
   - `english_source`: English operational text.
   - `Hindi`: Current draft Hindi translation.
   - `proposed_alternative (SUGGESTION not reviewed)`: Community suggestions for your review.
   - `machine_back_translation (unverified aid)`: Literal back-translation for reference only.
   - **`reviewer_verdict`**: Enter `ACCEPTED`, `ACCEPTED_WITH_EDITS`, or `REJECTED`.
   - **`suggested_correction`**: If edits are needed, enter the exact corrected Hindi text.
   - **`comment`**: Any rationale, regional notes, or administrative preferences.

---

## 2. Exporting Clean CSV from Google Sheets

When you have completed your review:
1. In Google Sheets, click **File** -> **Download** -> **Comma Separated Values (.csv)**.
2. Google Sheets automatically exports pure **UTF-8** without damaging Devanagari characters or conjuncts.
3. Save or send this returned `.csv` file back to the project maintainer.

> [!CAUTION]
> **Avoid Legacy Excel Plain CSV**: If using Microsoft Excel on Windows, standard `File -> Save As -> CSV` often converts non-ASCII text into ANSI/Windows-1252 question marks (`???`). If you must use Excel, specifically choose **"CSV UTF-8 (Comma delimited) (*.csv)"**.

---

## 3. Specific Focus Questions (8–10 Minutes)

1. **Term for Heatwave**:
   - Is **"ग्रीष्म परामर्श"** (Summer Advisory) acceptable, or is **"लू परामर्श"** or **"ताप-लहर परामर्श"** preferred in municipal emergency communications?
2. **Citizen Action Heading**:
   - Is **"सुझाए गए नागरिक कार्य (वार्ड स्तर):"** appropriate, or is **"सुझाई गई कार्रवाइयाँ (वार्ड स्तर):"** better suited?
3. **Cooling Shelters Directives**:
   - For `ACT_COOLING_SHELTERS`, should references to air-conditioned halls and dharmashalas be simplified to generic shaded civic shelters (*"ठंडे/छायादार सामुदायिक भवन और सार्वजनिक आश्रय स्थल"*), or is the existing text clear?
4. **Health & Labour Roles**:
   - Are terms like *"आशा कार्यकर्ता"* (ASHA workers), *"प्याऊ"* (water kiosks), and *"छायादार विश्राम"* (shaded rest) natural for municipal staff and public volunteers?
5. **Helpline Numerals**:
   - National emergency helpline uses standard numerals: `112`. Confirm that Western Arabic numerals are preferred over Devanagari numerals (`११२`) to prevent dialing errors during emergencies.

---

## 4. Ingestion Workflow

Once you return the completed `REVIEW_SHEET.csv`, the maintainer applies your review via:
```powershell
.\scripts\apply-hindi-review.ps1 -ReviewSheet "path/to/REVIEW_SHEET.csv" -ConfirmedBy "<Your Role or Initials>" -Date "YYYY-MM-DD"
```
The software strictly preserves the tag **`[PENDING HUMAN REVIEW]`** until this confirmed command is executed.
