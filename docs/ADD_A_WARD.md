# Adding a New Ward to HeatShield

HeatShield is architected for quick onboarding of municipal wards across India while maintaining strict input validation and zero arbitrary user input risks.

To add a new monitored ward or jurisdiction, exactly **2 files** must be modified.

---

## 1. Backend: Register Coordinates & Display Name

Open [`backend/src/main/java/heatshield/handler/LambdaApiHandler.java`](file:///e:/Projects/HeatShield/backend/src/main/java/heatshield/handler/LambdaApiHandler.java).

### A. Add Geographic Coordinates
In the `WARD_COORDINATES` map (around line 45), add the new ward's unique ID and its latitude/longitude coordinates:
```java
Map.entry("DEMO_PUNE", new double[]{18.5204, 73.8567})
```

### B. Add Human-Readable Name
In the `WARD_NAMES` map (around line 55), add the display name:
```java
Map.entry("DEMO_PUNE", "Demo ward: Pune Shivajinagar (illustrative)")
```

> [!NOTE]
> The backend automatically validates all incoming requests against `WARD_COORDINATES`. If a request is received for an unregistered ward ID, the API returns `HTTP 400 Bad Request` (`Invalid or unauthorized wardId`).

---

## 2. Frontend: Add Option to Target Ward Dropdown

Open [`frontend/index.html`](file:///e:/Projects/HeatShield/frontend/index.html).

Inside the `<select id="ward-select">` element under the `<optgroup label="Live Forecast Monitoring (Illustrative Demo Wards)">` group (around line 120), add an `<option>` tag:
```html
<option value="DEMO_PUNE">Demo ward: Pune Shivajinagar (illustrative)</option>
```

---

## 3. Operational Note on Scheduled Refresh Rule

The EventBridge scheduled warming rule (`heatshield-scheduled-refresh`) automatically runs every 15 minutes to pre-warm the Lambda runtime and populate DynamoDB cache.

- Currently, this background rule warms **`DEMO_AHMEDABAD`** only, keeping the AWS Free Tier footprint strictly within 1 Lambda execution per 15 minutes.
- Additional wards query the Open-Meteo live API on-demand when selected by a coordinator in the UI. If a ward has recently been fetched, subsequent reads are served seamlessly.

---

## 4. Verification

After adding the 2 entries:
1. Run backend unit tests:
   ```bash
   mvn test
   ```
2. Test the API locally or via curl:
   ```bash
   curl -s "http://localhost:8085/api/forecast?wardId=DEMO_PUNE&live=true"
   ```
3. Verify in browser that the ward appears in the dropdown and loads live weather data.
