package heatshield.domain;

/**
 * Immutable record representing the computed thermal risk indicators.
 */
public record HeatIndexResult(
        double temperatureC,
        double temperatureF,
        double humidityPct,
        double heatIndexF,
        double heatIndexC,
        double sunExposureHeatIndexF,
        double sunExposureHeatIndexC,
        HeatRiskTier riskTier,
        boolean extrapolated,
        String rationale
) {
    public static final double SUN_OFFSET_FAHRENHEIT = 15.0;

    public static double fahrenheitToCelsius(double f) {
        return (f - 32.0) * (5.0 / 9.0);
    }

    public static double celsiusToFahrenheit(double c) {
        return (c * (9.0 / 5.0)) + 32.0;
    }
}
