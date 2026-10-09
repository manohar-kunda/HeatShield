package heatshield.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import heatshield.domain.ForecastWindowSummary;
import heatshield.domain.HeatIndexResult;
import heatshield.domain.HeatRiskTier;
import heatshield.domain.HourlyHeatIndexPoint;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Service to ingest hourly forecasts from Open-Meteo API with strict 3s timeout
 * and 3-tier resilience: LIVE -> STALE -> OFFLINE SAMPLE.
 */
public class ForecastIngestionService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final HttpClient httpClient;

    public ForecastIngestionService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .build();
    }

    public ForecastIngestionService(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    public static final java.time.ZoneId IST_ZONE = java.time.ZoneId.of("Asia/Kolkata");

    /**
     * Fetches hourly forecast from Open-Meteo for given coordinates in IST.
     * URL pattern includes &timezone=Asia%2FKolkata.
     */
    public List<HourlyHeatIndexPoint> fetchHourlyForecast(double latitude, double longitude) throws Exception {
        String url = String.format(Locale.US,
                "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&hourly=temperature_2m,relative_humidity_2m&forecast_days=3&timezone=Asia%%2FKolkata",
                latitude, longitude);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Open-Meteo returned HTTP " + response.statusCode());
        }

        return parseForecastJson(response.body());
    }

    public static List<HourlyHeatIndexPoint> parseForecastJson(String jsonStr) throws Exception {
        JsonNode root = MAPPER.readTree(jsonStr);
        JsonNode hourly = root.get("hourly");
        if (hourly == null) {
            throw new IllegalArgumentException("Malformed forecast JSON: missing 'hourly' node");
        }

        JsonNode times = hourly.get("time");
        JsonNode temps = hourly.get("temperature_2m");
        JsonNode humidities = hourly.get("relative_humidity_2m");

        if (times == null || temps == null || humidities == null || times.size() == 0) {
            throw new IllegalArgumentException("Malformed forecast arrays");
        }

        List<HourlyHeatIndexPoint> points = new ArrayList<>();
        int count = Math.min(times.size(), Math.min(temps.size(), humidities.size()));

        for (int i = 0; i < count; i++) {
            String timeStr = times.get(i).asText();
            // Open-Meteo returns ISO local times in Asia/Kolkata like "2026-10-10T14:00"
            Instant instant;
            try {
                if (timeStr.contains("T") && !timeStr.endsWith("Z")) {
                    String fullIso = timeStr.length() == 16 ? timeStr + ":00" : timeStr;
                    java.time.LocalDateTime ldt = java.time.LocalDateTime.parse(fullIso);
                    instant = ldt.atZone(IST_ZONE).toInstant();
                } else {
                    instant = Instant.parse(timeStr.endsWith("Z") ? timeStr : timeStr + ":00Z");
                }
            } catch (Exception e) {
                instant = Instant.now().plus(Duration.ofHours(i));
            }

            double tempC = temps.get(i).asDouble();
            double rhPct = humidities.get(i).asDouble();

            // Clamp temperature to mathematical bounds [20.0, 55.0] for Rothfusz computation
            double clampedTemp = Math.max(20.0, Math.min(55.0, tempC));
            double clampedRh = Math.max(0.0, Math.min(100.0, rhPct));

            HeatIndexResult res = RothfuszCalculator.calculate(clampedTemp, clampedRh);
            points.add(new HourlyHeatIndexPoint(
                    instant,
                    tempC,
                    rhPct,
                    res.heatIndexC(),
                    res.heatIndexF(),
                    res.riskTier()
            ));
        }

        return points;
    }

    /**
     * Calculates peak stress window, composite peak hazard tier (NWS + IMD),
     * and aggregates hours per hazard tier across the series.
     */
    public static ForecastWindowSummary computeWindowSummary(List<HourlyHeatIndexPoint> points) {
        if (points == null || points.isEmpty()) {
            return new ForecastWindowSummary(
                    Instant.now(), Instant.now(), 0.0, 0.0, HeatRiskTier.BELOW_THRESHOLD, Collections.emptyMap()
            );
        }

        Map<HeatRiskTier, Integer> hoursPerTier = new EnumMap<>(HeatRiskTier.class);
        for (HeatRiskTier tier : HeatRiskTier.values()) {
            hoursPerTier.put(tier, 0);
        }

        HourlyHeatIndexPoint peakPoint = points.get(0);
        HeatRiskTier peakCompositeTier = heatshield.domain.WardAssessment.determineCompositeTier(
                peakPoint.tier(),
                heatshield.domain.ImdHeatwaveCategory.evaluatePlains(peakPoint.temperatureC(), null)
        );

        for (HourlyHeatIndexPoint pt : points) {
            hoursPerTier.put(pt.tier(), hoursPerTier.get(pt.tier()) + 1);

            HeatRiskTier hourlyComposite = heatshield.domain.WardAssessment.determineCompositeTier(
                    pt.tier(),
                    heatshield.domain.ImdHeatwaveCategory.evaluatePlains(pt.temperatureC(), null)
            );

            if (hourlyComposite.ordinal() > peakCompositeTier.ordinal()) {
                peakCompositeTier = hourlyComposite;
            }

            if (pt.heatIndexF() > peakPoint.heatIndexF()) {
                peakPoint = pt;
            }
        }

        // Peak window: from 2 hours before peak to 2 hours after peak
        Instant peakStart = peakPoint.timestamp().minus(Duration.ofHours(2));
        Instant peakEnd = peakPoint.timestamp().plus(Duration.ofHours(2));

        return new ForecastWindowSummary(
                peakStart,
                peakEnd,
                peakPoint.heatIndexC(),
                peakPoint.heatIndexF(),
                peakCompositeTier,
                hoursPerTier
        );
    }

    /**
     * Deterministic 72-hour offline fixture simulating an Ahmedabad pre-monsoon heatwave profile.
     * Used for zero-dependency local runs and resilience fallback when upstream weather API is unreachable.
     */
    public static List<HourlyHeatIndexPoint> createOfflineFixture() {
        List<HourlyHeatIndexPoint> points = new ArrayList<>();
        Instant start = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.HOURS);

        for (int i = 0; i < 72; i++) {
            Instant timestamp = start.plus(Duration.ofHours(i));
            int hourOfDay = (i + 12) % 24; // assume starting around midday

            // Sinusoidal diurnal temperature variation peaking at 15:00 (approx 42°C, trough 28°C)
            double tempC = 35.0 + 7.0 * Math.sin((hourOfDay - 9.0) * Math.PI / 12.0);
            // Relative humidity inversely related (trough 32% during peak heat, 65% at night)
            double rhPct = 48.0 - 16.0 * Math.sin((hourOfDay - 9.0) * Math.PI / 12.0);

            HeatIndexResult hi = RothfuszCalculator.calculate(tempC, rhPct);
            points.add(new HourlyHeatIndexPoint(
                    timestamp,
                    Math.round(tempC * 10.0) / 10.0,
                    Math.round(rhPct * 10.0) / 10.0,
                    hi.heatIndexC(),
                    hi.heatIndexF(),
                    hi.riskTier()
            ));
        }

        return points;
    }
}
