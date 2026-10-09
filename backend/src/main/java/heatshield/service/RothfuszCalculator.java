package heatshield.service;

import heatshield.domain.HeatIndexResult;
import heatshield.domain.HeatRiskTier;

/**
 * Mathematically rigorous implementation of the National Oceanic and Atmospheric Administration
 * (NOAA) / National Weather Service (NWS) Rothfusz Heat Index algorithm.
 *
 * References:
 * 1. Rothfusz, L. P. (1990). "The heat index 'equation' (or, more than you ever wanted to know about heat index)".
 *    Scientific Services Division, NWS Southern Region, Fort Worth, Texas.
 * 2. Official NWS Heat Safety Documentation: https://www.weather.gov/safety/heat-index
 */
public final class RothfuszCalculator {

    public static final double MIN_TEMP_C = 20.0;
    public static final double MAX_TEMP_C = 55.0;
    public static final double MIN_HUMIDITY = 0.0;
    public static final double MAX_HUMIDITY = 100.0;

    // Chart empirical validation ceiling (roughly 110°F / 43.3°C)
    public static final double EMPIRICAL_VALIDITY_CEILING_F = 110.0;

    private RothfuszCalculator() {
        // Utility class
    }

    /**
     * Calculates the Heat Index given temperature in Celsius and relative humidity in %.
     *
     * @param tempC Ambient temperature in °C [20.0 to 55.0]
     * @param rhPct Relative humidity percentage [0.0 to 100.0]
     * @return Immutable HeatIndexResult containing calculated figures, tier, and rationale
     */
    public static HeatIndexResult calculate(double tempC, double rhPct) {
        validateInputs(tempC, rhPct);

        double tempF = HeatIndexResult.celsiusToFahrenheit(tempC);

        // Step 1: Steadman simpler formula
        double hiSimple = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (rhPct * 0.094));

        // Step 2: Average with temperature
        double avg = (hiSimple + tempF) / 2.0;

        double finalHiF;
        String rationale;

        if (avg < 80.0) {
            // Under 80°F, Steadman simpler formula is used directly
            finalHiF = hiSimple;
            rationale = String.format("Calculated via Steadman baseline formula: apparent temperature %.1f°F (under 80°F threshold).", finalHiF);
        } else {
            // Step 3: Rothfusz 9-term polynomial regression
            double t = tempF;
            double rh = rhPct;
            double t2 = t * t;
            double rh2 = rh * rh;

            double hiRegression = -42.379
                    + (2.04901523 * t)
                    + (10.14333127 * rh)
                    - (0.22475541 * t * rh)
                    - (0.00683783 * t2)
                    - (0.05481717 * rh2)
                    + (0.00122874 * t2 * rh)
                    + (0.00085282 * t * rh2)
                    - (0.00000199 * t2 * rh2);

            // Step 4: Adjustments
            double adjustment = 0.0;

            if (rh < 13.0 && t >= 80.0 && t <= 112.0) {
                // Low-RH adjustment: subtract [(13 - RH)/4] * sqrt[(17 - |T - 95|)/17]
                double term = (17.0 - Math.abs(t - 95.0)) / 17.0;
                if (term > 0.0) {
                    adjustment = -((13.0 - rh) / 4.0) * Math.sqrt(term);
                }
                rationale = String.format("Computed via Rothfusz regression with Low-RH adjustment of %.2f°F.", adjustment);
            } else if (rh > 85.0 && t >= 80.0 && t <= 87.0) {
                // High-RH adjustment: add [(RH - 85)/10] * [(87 - T)/5]
                adjustment = ((rh - 85.0) / 10.0) * ((87.0 - t) / 5.0);
                rationale = String.format("Computed via Rothfusz regression with High-RH adjustment of +%.2f°F.", adjustment);
            } else {
                rationale = "Computed via standard NOAA Rothfusz 9-term regression.";
            }

            finalHiF = hiRegression + adjustment;
        }

        boolean extrapolated = tempF > EMPIRICAL_VALIDITY_CEILING_F;
        if (extrapolated) {
            rationale += " [Notice: Input temperature exceeds 110°F / 43.3°C; extrapolated beyond standard empirical chart range].";
        }

        double finalHiC = HeatIndexResult.fahrenheitToCelsius(finalHiF);
        double sunF = finalHiF + HeatIndexResult.SUN_OFFSET_FAHRENHEIT;
        double sunC = HeatIndexResult.fahrenheitToCelsius(sunF);

        HeatRiskTier tier = HeatRiskTier.fromHeatIndexFahrenheit(finalHiF);

        return new HeatIndexResult(
                roundOneDecimal(tempC),
                roundOneDecimal(tempF),
                roundOneDecimal(rhPct),
                roundOneDecimal(finalHiF),
                roundOneDecimal(finalHiC),
                roundOneDecimal(sunF),
                roundOneDecimal(sunC),
                tier,
                extrapolated,
                rationale
        );
    }

    private static void validateInputs(double tempC, double rhPct) {
        if (tempC < MIN_TEMP_C || tempC > MAX_TEMP_C) {
            throw new IllegalArgumentException(String.format(
                    "Temperature must be between %.1f°C and %.1f°C (valid range for heat risk assessment). Provided: %.1f°C",
                    MIN_TEMP_C, MAX_TEMP_C, tempC));
        }
        if (rhPct < MIN_HUMIDITY || rhPct > MAX_HUMIDITY) {
            throw new IllegalArgumentException(String.format(
                    "Relative humidity must be a percentage between %.1f%% and %.1f%%. Provided: %.1f%%",
                    MIN_HUMIDITY, MAX_HUMIDITY, rhPct));
        }
    }

    private static double roundOneDecimal(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
