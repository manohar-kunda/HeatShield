# Originality and Clean-Room Statement

## 1. Clean-Room Provenance
- HeatShield is an original, clean-room software application built specifically for the **Environmental Hacks** hackathon (October 8–11, 2026).
- **Zero code reuse**: No code, assets, schemas, or templates were copied, ported, or repurposed from any prior project (including JalRakshak or any third-party repository).
- All code, configuration files, and documentation were created de novo in this repository.
- Verification: A clean search across all tracked repository files (`git ls-files | grep -i jalrakshak`) returns 0 matches.

## 2. External Authoritative Sources and Licenses

| Source | Role / Content | Terms & Attribution |
| :--- | :--- | :--- |
| **National Weather Service (NWS) / NOAA** | Rothfusz (1990) Heat Index regression formulas and Steadman baseline equations. | US Government Work (Public Domain). Cited: `weather.gov/safety/heat-index`. |
| **India Meteorological Department (IMD)** | Heatwave criteria for plains, coastal, and hilly stations. | Official Indian Government Public Service Data (`mausam.imd.gov.in`). |
| **NDMA & AMC Heat Action Plans** | Action items, institutional roles, and operational time windows. | Public disaster management policy guidance (NDMA 2019 Guidelines and Ahmedabad HAP 2023). |
| **Open-Meteo Weather API** | Hourly 72-hour forecast data (`temperature_2m`, `relative_humidity_2m`). | Creative Commons Attribution 4.0 International (CC BY 4.0). Requires explicit display link: `Weather data by Open-Meteo.com`. |

## 3. Mandatory AI Coding Tool Disclosure
- This codebase was generated and iteratively pair-programmed with **Google Antigravity** acting as technical mentor, test engineer, and hackathon execution coach.
- All domain calculations, scientific limits, and API contracts were grounded in authoritative documentation and validated through deterministic automated tests.

## 4. Prior Art & Distinction
*(To be completed by the author for submission writeup)*
- Prior systems focus primarily on regional forecasting maps (macro-level warnings) or consumer weather apps that display single temperature values without actionable community checklists.
- HeatShield bridges the "last-mile operational gap" by turning forecast heat stress directly into ward-level action tasks with measurable completion tracking.
