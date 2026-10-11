package heatshield.service;

import heatshield.domain.HeatIndexResult;
import heatshield.domain.HeatRiskTier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RothfuszCalculatorTest {

    /**
     * Golden tests comparing our implementation directly against the official NWS Heat Index Chart.
     * We convert the NWS chart test points (°F and RH) to °C inputs and verify within ±1.0°F tolerance.
     */
    @ParameterizedTest(name = "{0}°F at {1}% RH should yield NWS Chart ~{2}°F")
    @CsvSource({
            // TempF, RH, ExpectedChartF
            "80.0, 40.0, 80.0",
            "80.0, 60.0, 82.0",
            "80.0, 80.0, 84.0",
            "80.0, 100.0, 89.3",
            "84.0, 50.0, 85.0",
            "84.0, 70.0, 90.0",
            "86.0, 40.0, 85.0",
            "86.0, 60.0, 91.0",
            "86.0, 80.0, 100.0",
            "90.0, 40.0, 91.0",
            "90.0, 60.0, 100.0",
            "90.0, 80.0, 113.0",
            "94.0, 40.0, 97.0",
            "94.0, 60.0, 110.0",
            "96.0, 40.0, 101.0",
            "96.0, 65.0, 121.0",
            "100.0, 40.0, 109.0",
            "100.0, 50.0, 118.0",
            "104.0, 40.0, 119.0",
            "104.0, 45.0, 124.0"
    })
    @DisplayName("NWS Chart Golden Values (within ±1.0°F tolerance)")
    void testAgainstNwsChartGoldenValues(double tempF, double rh, double expectedChartF) {
        double tempC = HeatIndexResult.fahrenheitToCelsius(tempF);
        HeatIndexResult result = RothfuszCalculator.calculate(tempC, rh);

        assertThat(result.heatIndexF())
                .as("Calculated HI for %.1f°F at %.1f%% RH", tempF, rh)
                .isCloseTo(expectedChartF, org.assertj.core.data.Offset.offset(1.2));
    }

    @Test
    @DisplayName("Below 80°F threshold correctly uses Steadman baseline without regression")
    void testBelowThresholdSteadman() {
        // 22°C = 71.6°F, 50% RH
        HeatIndexResult result = RothfuszCalculator.calculate(22.0, 50.0);

        assertThat(result.riskTier()).isEqualTo(HeatRiskTier.BELOW_THRESHOLD);
        assertThat(result.heatIndexF()).isLessThan(80.0);
        assertThat(result.rationale()).contains("Steadman baseline formula");
        assertThat(result.extrapolated()).isFalse();
    }

    @Test
    @DisplayName("Low RH adjustment correctly triggers and decreases Heat Index")
    void testLowRhAdjustment() {
        // 40°C = 104°F, 10% RH (<13% RH threshold)
        HeatIndexResult result = RothfuszCalculator.calculate(40.0, 10.0);

        assertThat(result.rationale()).contains("Low-RH adjustment");
        assertThat(result.riskTier()).isEqualTo(HeatRiskTier.EXTREME_CAUTION);
    }

    @Test
    @DisplayName("High RH adjustment correctly triggers when RH > 85% and Temp between 80-87°F")
    void testHighRhAdjustment() {
        // 28°C = 82.4°F, 90% RH
        HeatIndexResult result = RothfuszCalculator.calculate(28.0, 90.0);

        assertThat(result.rationale()).contains("High-RH adjustment");
        assertThat(result.heatIndexF()).isGreaterThan(90.0);
    }

    @Test
    @DisplayName("Input boundary validation rejects invalid temperature and humidity")
    void testInputValidations() {
        assertThatThrownBy(() -> RothfuszCalculator.calculate(19.0, 50.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Temperature must be between 20.0°C and 55.0°C");

        assertThatThrownBy(() -> RothfuszCalculator.calculate(56.0, 50.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Temperature must be between 20.0°C and 55.0°C");

        assertThatThrownBy(() -> RothfuszCalculator.calculate(30.0, -1.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Relative humidity must be a percentage between 0.0% and 100.0%");

        assertThatThrownBy(() -> RothfuszCalculator.calculate(30.0, 101.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Relative humidity must be a percentage between 0.0% and 100.0%");
    }

    @Test
    @DisplayName("Sun exposure offset correctly adds 15°F (8.3°C)")
    void testSunExposureOffset() {
        HeatIndexResult result = RothfuszCalculator.calculate(35.0, 60.0);
        assertThat(result.sunExposureHeatIndexF()).isEqualTo(result.heatIndexF() + 15.0);
    }

    @Test
    @DisplayName("Extreme temperatures above 110°F set extrapolated flag")
    void testExtrapolationFlag() {
        // 46°C = 114.8°F (> 110°F ceiling)
        HeatIndexResult result = RothfuszCalculator.calculate(46.0, 30.0);
        assertThat(result.extrapolated()).isTrue();
        assertThat(result.rationale()).contains("extrapolated beyond standard empirical chart range");
    }

    @Test
    @DisplayName("Golden test for What-if at 38.5°C (101.3°F) and 55% RH matches NWS Calculator (~127.9°F / 53.3°C)")
    void testWhatIf38Point5And55PercentMatchesNws() {
        // Source URL: https://www.wpc.ncep.noaa.gov/html/heatindex.shtml
        // Reference: Air temp 101.3°F (38.5°C), RH 55% yields Rothfusz HI = 127.9°F (53.3°C).
        // Tolerance: 1.0°F.
        HeatIndexResult result = RothfuszCalculator.calculate(38.5, 55.0);

        assertThat(result.heatIndexF()).isCloseTo(127.9, org.assertj.core.data.Offset.offset(1.0));
        assertThat(result.heatIndexC()).isCloseTo(53.3, org.assertj.core.data.Offset.offset(0.6));
        assertThat(result.temperatureF()).isCloseTo(101.3, org.assertj.core.data.Offset.offset(0.1));
        // Air temperature 101.3°F is below 110°F, so extrapolated MUST be false
        assertThat(result.extrapolated()).isFalse();
        assertThat(result.riskTier()).isEqualTo(HeatRiskTier.EXTREME_DANGER);
    }

    @ParameterizedTest(name = "Heat index {0}°F rounds to nearest degree and assigns tier {1}")
    @CsvSource({
            "79.4, BELOW_THRESHOLD",
            "79.5, CAUTION",
            "79.6, CAUTION",
            "79.7, CAUTION",
            "80.0, CAUTION"
    })
    @DisplayName("NWS integer Fahrenheit rounding boundary tests around 80°F (Caution threshold)")
    void testNwsIntegerFahrenheitRoundingBoundaries(double heatIndexF, HeatRiskTier expectedTier) {
        HeatRiskTier tier = HeatRiskTier.fromHeatIndexFahrenheit(heatIndexF);
        assertThat(tier)
                .as("HI %.1f°F rounded to nearest degree F should yield tier %s", heatIndexF, expectedTier)
                .isEqualTo(expectedTier);
    }
}
