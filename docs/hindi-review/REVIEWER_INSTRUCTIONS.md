# Hindi Linguistic & Cultural Review Guide (10 Minutes)

Welcome! Thank you for taking a few minutes to review the Hindi terminology used in **HeatShield**, an open-source civic heatwave risk-to-action planner for municipal ward officers and disaster response teams in India.

Because software translations must never risk confusion during public health emergencies, **no automated system or AI agent is authorized to certify Hindi translations**. We require human expert feedback from a native Hindi speaker.

---

## What We Need You to Check (Estimated Time: 8 to 10 Minutes)

Please open [`docs/hindi-review/REVIEW_SHEET.csv`](file:///e:/Projects/HeatShield/docs/hindi-review/REVIEW_SHEET.csv) in Excel, LibreOffice, or any text editor. For each row, check:

1. **Meaning Accuracy**: Does the Hindi text convey the exact operational meaning intended by the English operational guideline?
2. **Calm and Safe Tone**: Is the phrasing calm, directive, and authoritative without causing panic?
3. **Respectful Register**: Is the register formal, courteous, and standard for Indian municipal and administrative governance (*शहरी निकाय / आपदा प्रबंधन*)?
4. **Readability for Ward Workers**: Is it readily understood by ward sanitary inspectors, ASHA healthcare workers, labour volunteers, and local residents?

---

## Specific Terminology Questions to Resolve

Please provide guidance on these specific questions in your comments or corrections:

1. **Heatwave Terminology**:
   - Currently, the header uses **"ग्रीष्म परामर्श"** (Summer Advisory).
   - In your region or in municipal disaster management notices, is **"लू परामर्श"** or **"ताप-लहर परामर्श"** or **"ग्रीष्म परामर्श"** the most standard, natural, and recognizable term for a heatwave emergency advisory?
2. **Advisory Formulation**:
   - Is **"वार्ड ग्रीष्म परामर्श (प्रारूप)"** appropriate, or should it be **"वार्ड लू कार्ययोजना परामर्श (प्रारूप)"** or **"वार्ड ताप-लहर परामर्श (प्रारूप)"**?
3. **Temperature Units & Numerals**:
   - Are standard numerals (`112`, `108`, `42°C`) appropriate, or are Devanagari numerals expected in formal notices? (Our field research indicates Western Arabic digits `112` are standard across Indian emergency helplines to avoid misdialing).
4. **Action Directives**:
   - Review the verbs used in the 5 action directives (`संचालन सुनिश्चित करें`, `लागू करें`, `खोलें`, `भेजें`, `सतर्क करें`). Do they feel actionable and natural for municipal duty rosters?
5. **New Weekday, Month, and Deadline Strings**:
   - Rows marked `new, not reviewed` in the comment column represent newly localized time elements (weekdays, months, 24h deadline templates). Please check that `<weekday>, <date> <month>, <time> IST को` and `...IST से पहले` read naturally.

---

## How to Return Your Review

In [`REVIEW_SHEET.csv`](file:///e:/Projects/HeatShield/docs/hindi-review/REVIEW_SHEET.csv):
- Rows marked with `changed after first draft - reviewer please check` or `new, not reviewed` in the comment column require particular focus.
- Enter **`ACCEPTED`**, **`ACCEPTED_WITH_EDITS`**, or **`REJECTED`** in the `reviewer_verdict` column.
- If you have an edit, place the exact corrected Hindi text in the `suggested_correction` column.
- Note any reasoning or nuances in the `comment` column.
- Save the file as UTF-8.

Once complete, the maintainer will run the review ingest script:
```powershell
.\scripts\apply-hindi-review.ps1 -ReviewSheet "docs/hindi-review/REVIEW_SHEET.csv" -ConfirmedBy "<Your Role or Initials>" -Date "YYYY-MM-DD"
```
Until this script is executed with confirmed credentials, the system strictly maintains the status **`PENDING HUMAN REVIEW`**.

Thank you for helping safeguard community health and clarity!
