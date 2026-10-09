package heatshield.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class ImdHeatwaveCategoryTest {

    @Test
    @DisplayName("Plains stations below 40.0°C are always Normal")
    void testPlainsBelowForty() {
        assertThat(ImdHeatwaveCategory.evaluatePlains(39.9, 7.0)).isEqualTo(ImdHeatwaveCategory.NORMAL);
        assertThat(ImdHeatwaveCategory.evaluatePlains(38.0, null)).isEqualTo(ImdHeatwaveCategory.NORMAL);
    }

    @ParameterizedTest(name = "MaxTemp {0}°C with departure {1}°C yields IMD category {2}")
    @CsvSource({
            "40.5, 4.0, NORMAL",
            "41.0, 4.5, HEAT_WAVE",
            "42.0, 6.4, HEAT_WAVE",
            "41.5, 6.5, SEVERE_HEAT_WAVE",
            "45.0, 1.0, HEAT_WAVE",
            "46.5, 3.0, HEAT_WAVE",
            "47.0, 0.0, SEVERE_HEAT_WAVE",
            "48.5, -1.0, SEVERE_HEAT_WAVE"
    })
    void testPlainsAbsoluteAndDepartureCriteria(double maxTempC, Double departureC, ImdHeatwaveCategory expected) {
        assertThat(ImdHeatwaveCategory.evaluatePlains(maxTempC, departureC)).isEqualTo(expected);
    }
}
