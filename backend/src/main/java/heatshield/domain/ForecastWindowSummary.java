package heatshield.domain;

import java.time.Instant;
import java.util.Map;

/**
 * 72-Hour Forecast Heat Risk Window Summary.
 * Identifies the upcoming peak thermal stress window and counts hours per hazard tier.
 */
public record ForecastWindowSummary(
        Instant peakWindowStart,
        Instant peakWindowEnd,
        double maxHeatIndexC,
        double maxHeatIndexF,
        HeatRiskTier peakTier,
        Map<HeatRiskTier, Integer> hoursPerTier
) {
}
