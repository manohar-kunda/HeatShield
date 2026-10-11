package heatshield.service;

import heatshield.domain.ForecastWindowSummary;
import heatshield.domain.HeatRiskTier;
import heatshield.domain.HourlyHeatIndexPoint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ForecastIngestionServiceTest {

    private static final String SAMPLE_OPEN_METEO_JSON = """
            {
              "latitude": 28.61,
              "longitude": 77.23,
              "hourly": {
                "time": [
                  "2026-10-10T00:00",
                  "2026-10-10T01:00",
                  "2026-10-10T12:00",
                  "2026-10-10T13:00"
                ],
                "temperature_2m": [25.0, 26.0, 42.0, 43.0],
                "relative_humidity_2m": [60.0, 65.0, 40.0, 38.0]
              }
            }
            """;

    @Test
    @DisplayName("Successfully parses Open-Meteo JSON into 4 hourly points")
    void testParseOpenMeteoJson() throws Exception {
        List<HourlyHeatIndexPoint> points = ForecastIngestionService.parseForecastJson(SAMPLE_OPEN_METEO_JSON);

        assertThat(points).hasSize(4);

        // First point: 25°C, 60% RH -> Caution or Below
        HourlyHeatIndexPoint p1 = points.get(0);
        assertThat(p1.temperatureC()).isEqualTo(25.0);
        assertThat(p1.humidityPct()).isEqualTo(60.0);

        // Peak point at 13:00: 43°C, 38% RH -> Extreme Danger or Danger
        HourlyHeatIndexPoint peak = points.get(3);
        assertThat(peak.temperatureC()).isEqualTo(43.0);
        assertThat(peak.tier().ordinal()).isGreaterThanOrEqualTo(HeatRiskTier.DANGER.ordinal());
    }

    @Test
    @DisplayName("Computes forecast window summary identifying the peak hazard tier")
    void testComputeWindowSummary() throws Exception {
        List<HourlyHeatIndexPoint> points = ForecastIngestionService.parseForecastJson(SAMPLE_OPEN_METEO_JSON);
        ForecastWindowSummary summary = ForecastIngestionService.computeWindowSummary(points);

        assertThat(summary.peakTier().ordinal()).isGreaterThanOrEqualTo(HeatRiskTier.DANGER.ordinal());
        assertThat(summary.hoursPerTier()).containsKey(HeatRiskTier.DANGER);
        assertThat(summary.maxHeatIndexC()).isGreaterThan(40.0);
    }

    @Test
    @DisplayName("Malformed JSON throws descriptive IllegalArgumentException")
    void testMalformedJson() {
        assertThatThrownBy(() -> ForecastIngestionService.parseForecastJson("{\"hourly\": {}}"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malformed forecast arrays");
    }

    @Test
    @DisplayName("Deterministic offline fixture generates 72 hourly points spanning diurnal variation")
    void testOfflineFixtureGeneration() {
        List<HourlyHeatIndexPoint> points = ForecastIngestionService.createOfflineFixture();
        assertThat(points).hasSize(72);

        ForecastWindowSummary summary = ForecastIngestionService.computeWindowSummary(points);
        assertThat(summary).isNotNull();
        assertThat(summary.hoursPerTier()).isNotEmpty();
        assertThat(summary.maxHeatIndexC()).isGreaterThan(35.0);
    }

    @Test
    @DisplayName("Replay fixture maximum dry-bulb temperature strictly equals raw Open-Meteo archive data (45.4°C)")
    void testReplayFixtureMaxDryBulbMatchesRawArchive() {
        List<HourlyHeatIndexPoint> replayPoints = ForecastIngestionService.createAhmedabad2010ReplayFixture();
        assertThat(replayPoints).hasSize(72);

        double maxReplayDryBulb = replayPoints.stream()
                .mapToDouble(HourlyHeatIndexPoint::temperatureC)
                .max()
                .orElseThrow();

        // Exact maximum dry-bulb in docs/data/replay-ahmedabad-2010-raw.json is 45.4°C on 21 May 2010 16:00 IST
        assertThat(maxReplayDryBulb).isEqualTo(45.4);
    }
}
