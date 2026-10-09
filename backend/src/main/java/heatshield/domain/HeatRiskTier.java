package heatshield.domain;

/**
 * Contiguous, half-open NWS Heat Index hazard tiers.
 * Verified against US National Weather Service documentation (weather.gov/safety/heat-index).
 */
public enum HeatRiskTier {
    BELOW_THRESHOLD(
            "Below Threshold / Not Rated",
            "Baseline conditions. No thermal heat advisory triggered.",
            Double.NEGATIVE_INFINITY,
            80.0
    ),
    CAUTION(
            "Caution",
            "Fatigue is possible with prolonged exposure and/or physical activity.",
            80.0,
            90.0
    ),
    EXTREME_CAUTION(
            "Extreme Caution",
            "Sunstroke, muscle cramps, and heat exhaustion are possible with prolonged exposure and/or physical activity.",
            90.0,
            103.0
    ),
    DANGER(
            "Danger",
            "Sunstroke, muscle cramps, and heat exhaustion are likely; heatstroke is possible with prolonged exposure and/or physical activity.",
            103.0,
            125.0
    ),
    EXTREME_DANGER(
            "Extreme Danger",
            "Heatstroke is highly likely with continued exposure.",
            125.0,
            Double.POSITIVE_INFINITY
    );

    private final String label;
    private final String operationalDescription;
    private final double minFahrenheitInclusive;
    private final double maxFahrenheitExclusive;

    HeatRiskTier(String label, String operationalDescription, double minFahrenheitInclusive, double maxFahrenheitExclusive) {
        this.label = label;
        this.operationalDescription = operationalDescription;
        this.minFahrenheitInclusive = minFahrenheitInclusive;
        this.maxFahrenheitExclusive = maxFahrenheitExclusive;
    }

    public String getLabel() {
        return label;
    }

    public String getOperationalDescription() {
        return operationalDescription;
    }

    public double getMinFahrenheitInclusive() {
        return minFahrenheitInclusive;
    }

    public double getMaxFahrenheitExclusive() {
        return maxFahrenheitExclusive;
    }

    /**
     * Evaluates official contiguous tier based on mathematical round-half-up to nearest integer Fahrenheit.
     */
    public static HeatRiskTier fromHeatIndexFahrenheit(double heatIndexF) {
        long roundedF = Math.round(heatIndexF);
        if (roundedF < 80) {
            return BELOW_THRESHOLD;
        } else if (roundedF < 90) {
            return CAUTION;
        } else if (roundedF < 103) {
            return EXTREME_CAUTION;
        } else if (roundedF < 125) {
            return DANGER;
        } else {
            return EXTREME_DANGER;
        }
    }
}
