package heatshield.domain;

import java.time.Instant;
import java.util.List;

/**
 * Hourly heat index calculation point across the 72-hour forecast window.
 */
public record HourlyHeatIndexPoint(
        Instant timestamp,
        double temperatureC,
        double humidityPct,
        double heatIndexC,
        double heatIndexF,
        HeatRiskTier tier
) {
}
