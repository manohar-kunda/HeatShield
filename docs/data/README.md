# Open-Meteo Historical Weather Archive Dataset

## Dataset Details
- **Target Location**: Ahmedabad Central, Gujarat, India (Latitude: `23.0225°N`, Longitude: `72.5714°E`)
- **Target Episode**: 20 May 2010 00:00 to 22 May 2010 23:00 IST (72 hourly observations)
- **Archive Request URL**:
  ```
  https://archive-api.open-meteo.com/v1/archive?latitude=23.0225&longitude=72.5714&start_date=2010-05-20&end_date=2010-05-22&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&timezone=Asia%2FKolkata
  ```
- **Retrieval Timestamp**: `2026-10-10T20:39:45Z` (11 Oct 2026, 02:09:45 IST)
- **License**: Creative Commons Attribution 4.0 International ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), courtesy of Open-Meteo.com / ERA5 Reanalysis.
- **Raw File Path**: [`docs/data/replay-ahmedabad-2010-raw.json`](file:///e:/Projects/HeatShield/docs/data/replay-ahmedabad-2010-raw.json)
- **File Size**: 2,694 bytes
- **SHA-256 Digest**:
  ```
  8279957f198e4dab445de7211b964ca52d2cbc22d6e27f04979407879650d9c6
  ```

---

## Production Rothfusz Engine Recomputation Summary

All 72 rows are ingested unmodified and evaluated through HeatShield's production NWS Rothfusz 9-term polynomial calculation engine (`RothfuszCalculator`):

### First 3 Rows:
1. `2010-05-20T00:00`: Dry-Bulb = `34.2°C`, RH = `30%`, Heat Index = `33.6°C` (`92.4°F`), Extrapolated = `false`
2. `2010-05-20T01:00`: Dry-Bulb = `32.7°C`, RH = `41%`, Heat Index = `33.5°C` (`92.3°F`), Extrapolated = `false`
3. `2010-05-20T02:00`: Dry-Bulb = `31.8°C`, RH = `47%`, Heat Index = `33.3°C` (`92.0°F`), Extrapolated = `false`

### Current Evaluation Hour (08:00 AM IST on 20 May 2010):
- `2010-05-20T08:00`: Dry-Bulb = `33.2°C`, RH = `46%`, Heat Index = `35.7°C` (`96.3°F`), Extrapolated = `false`

### Maximum Dry-Bulb Across 72-Hour Series:
- **Timestamp**: `2010-05-21T16:00 IST` (4:00 PM IST on 21 May 2010)
- **Ambient Dry-Bulb**: `45.4°C` (`113.7°F`)
- **Relative Humidity**: `14%`
- **Heat Index**: `44.5°C` (`112.1°F`)
- **Extrapolation Flag**: `true` ($T > 110.0^\circ\text{F} / 43.3^\circ\text{C}$, flagged as extrapolated)

### Maximum Heat Index Across 72-Hour Series:
- **Timestamp**: `2010-05-20T13:00 IST` (1:00 PM IST on 20 May 2010)
- **Ambient Dry-Bulb**: `43.7°C` (`110.7°F`), RH = `21%`
- **Heat Index**: `45.6°C` (`114.0°F`)
- **Extrapolation Flag**: `true` (outside validated polynomial range)

---

## Citation & Provenance Attribution
- **ERA5 / Open-Meteo Reanalysis**: Used for all series data points (max dry-bulb `45.4°C` at 16:00, peak heat index `45.6°C` at 13:00).
- **Airport Station Observation**: `46.8°C` appears strictly as a separate cited station reading (reported in the AMC Heat Action Plan, page not verified; IMD Ahmedabad Airport Station 42647). It is never represented as "Current" or "Heat Index".
- **Mathematical Bound**: Computed by the same NWS regression as live data; values above 110°F (43.3°C) are outside its validated range and are flagged as extrapolated.
