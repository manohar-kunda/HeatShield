package heatshield.domain;

/**
 * Verified criteria from India Meteorological Department (IMD) (mausam.imd.gov.in).
 */
public enum ImdHeatwaveCategory {
    NORMAL("Normal", "Temperatures within expected climatological range."),
    HEAT_WAVE("Heat Wave", "Official IMD Heat Wave threshold met."),
    SEVERE_HEAT_WAVE("Severe Heat Wave", "Official IMD Severe Heat Wave threshold met.");

    private final String label;
    private final String description;

    ImdHeatwaveCategory(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Evaluates IMD category for Plains stations.
     * Plains minimum gate: Max Temperature >= 40.0°C.
     * Absolute Criteria:
     * - Heat Wave if Max Temp >= 45.0°C
     * - Severe Heat Wave if Max Temp >= 47.0°C
     * Departure Criteria (if departureC is provided):
     * - Heat Wave if departure between +4.5°C and +6.4°C
     * - Severe Heat Wave if departure > +6.4°C
     */
    public static ImdHeatwaveCategory evaluatePlains(double maxTempC, Double departureC) {
        if (maxTempC < 40.0) {
            return NORMAL;
        }

        // Check absolute criteria first
        if (maxTempC >= 47.0) {
            return SEVERE_HEAT_WAVE;
        }

        if (departureC != null) {
            if (departureC > 6.4) {
                return SEVERE_HEAT_WAVE;
            }
            if (departureC >= 4.5) {
                return HEAT_WAVE;
            }
        }

        if (maxTempC >= 45.0) {
            return HEAT_WAVE;
        }

        return NORMAL;
    }
}
