package heatshield.domain;

import java.time.Instant;
import java.util.List;

/**
 * Complete assessment snapshot for a ward.
 * Contains heat index computations, IMD signals, composite operational tier, and assigned actions.
 */
public record WardAssessment(
        String assessmentId,
        String wardId,
        String wardName,
        HeatIndexResult heatIndex,
        ImdHeatwaveCategory imdCategory,
        HeatRiskTier operationalTier,
        List<TrackedAction> actions,
        String dataSource, // "LIVE_OPEN_METEO", "STALE_CACHE", "MANUAL_INPUT", or "OFFLINE_SAMPLE"
        Instant timestamp,
        ForecastWindowSummary forecastSummary,
        List<HourlyHeatIndexPoint> hourlyForecast
) {
    public WardAssessment(
            String assessmentId,
            String wardId,
            String wardName,
            HeatIndexResult heatIndex,
            ImdHeatwaveCategory imdCategory,
            HeatRiskTier operationalTier,
            List<TrackedAction> actions,
            String dataSource,
            Instant timestamp
    ) {
        this(assessmentId, wardId, wardName, heatIndex, imdCategory, operationalTier, actions, dataSource, timestamp, null, List.of());
    }
    public static HeatRiskTier determineCompositeTier(HeatRiskTier nwsTier, ImdHeatwaveCategory imd) {
        if (nwsTier == null) {
            nwsTier = HeatRiskTier.BELOW_THRESHOLD;
        }

        // If IMD declares Severe Heat Wave, elevate to at least DANGER
        if (imd == ImdHeatwaveCategory.SEVERE_HEAT_WAVE) {
            if (nwsTier.ordinal() < HeatRiskTier.DANGER.ordinal()) {
                return HeatRiskTier.DANGER;
            }
        } else if (imd == ImdHeatwaveCategory.HEAT_WAVE) {
            if (nwsTier.ordinal() < HeatRiskTier.EXTREME_CAUTION.ordinal()) {
                return HeatRiskTier.EXTREME_CAUTION;
            }
        }
        return nwsTier;
    }
}
