package heatshield.service;

import heatshield.domain.ActionStatus;
import heatshield.domain.HeatRiskTier;
import heatshield.domain.ImdHeatwaveCategory;
import heatshield.domain.WardAssessment;
import heatshield.repository.InMemoryAssessmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AssessmentServiceTest {

    private final PlaybookService playbookService = new PlaybookService();
    private final InMemoryAssessmentRepository repository = new InMemoryAssessmentRepository();
    private final AssessmentService assessmentService = new AssessmentService(playbookService, repository);

    @Test
    @DisplayName("End-to-End assessment creation with elevated temperature triggers Danger tier and actions")
    void testAssessmentCreation() {
        // 38°C (100.4°F) and 60% RH -> HI ~ 130°F (Danger / Extreme Danger)
        WardAssessment assessment = assessmentService.createAssessment(
                "WARD_12",
                "Central Market & Bus Terminus",
                38.0,
                60.0,
                null,
                "MANUAL_INPUT"
        );

        assertThat(assessment).isNotNull();
        assertThat(assessment.wardId()).isEqualTo("WARD_12");
        assertThat(assessment.operationalTier()).isNotNull();
        assertThat(assessment.operationalTier().ordinal()).isGreaterThanOrEqualTo(HeatRiskTier.DANGER.ordinal());
        assertThat(assessment.actions()).isNotEmpty();

        // Check first action is initialized to PENDING
        assertThat(assessment.actions().get(0).status()).isEqualTo(ActionStatus.PENDING);

        // Verify repository saved the assessment
        assertThat(repository.getLatestAssessment("WARD_12")).isPresent();
    }

    @Test
    @DisplayName("IMD Severe Heatwave elevates operational tier when NWS is lower")
    void testImdSignalElevation() {
        // 47.0°C and 15% RH (Dry extreme heat in Northern Plains)
        WardAssessment assessment = assessmentService.createAssessment(
                "WARD_05",
                "Industrial Area",
                47.0,
                15.0,
                null,
                "MANUAL_INPUT"
        );

        assertThat(assessment.imdCategory()).isEqualTo(ImdHeatwaveCategory.SEVERE_HEAT_WAVE);
        assertThat(assessment.operationalTier().ordinal()).isGreaterThanOrEqualTo(HeatRiskTier.DANGER.ordinal());
    }

    @Test
    @DisplayName("72-Hour peak tier overrides current-hour mild temperature to trigger proactive actions")
    void testPeakCompositeTierOverridesCurrentMildHour() {
        // Current instantaneous conditions: 26°C and 40% RH (Below Threshold / Caution)
        // Forecast summary indicates peak tier is EXTREME_DANGER occurring in afternoon
        java.time.Instant nowUtc = java.time.Instant.parse("2026-10-10T02:30:00Z"); // 08:00 AM IST
        java.time.Clock fixedClock = java.time.Clock.fixed(nowUtc, java.time.ZoneId.of("Asia/Kolkata"));
        AssessmentService fixedService = new AssessmentService(playbookService, repository, fixedClock);

        heatshield.domain.ForecastWindowSummary peakSummary = new heatshield.domain.ForecastWindowSummary(
                nowUtc.plus(java.time.Duration.ofHours(5)),
                nowUtc.plus(java.time.Duration.ofHours(9)),
                48.5,
                119.3,
                HeatRiskTier.EXTREME_DANGER,
                java.util.Map.of(HeatRiskTier.EXTREME_DANGER, 4)
        );

        WardAssessment assessment = fixedService.createAssessmentWithForecast(
                "WARD_12",
                "Ahmedabad Central",
                26.0,
                40.0,
                0.0,
                "LIVE_OPEN_METEO",
                peakSummary,
                java.util.List.of()
        );

        // Instantaneous NWS heat index is BELOW_THRESHOLD or CAUTION (< 80°F)
        assertThat(assessment.heatIndex().riskTier()).isEqualTo(HeatRiskTier.BELOW_THRESHOLD);

        // BUT operational tier MUST be elevated to peak forecast tier (EXTREME_DANGER)
        assertThat(assessment.operationalTier()).isEqualTo(HeatRiskTier.EXTREME_DANGER);

        // AND all 5 actions must be activated
        assertThat(assessment.actions()).hasSize(5);

        // Verify deadline for BEFORE_10_AM is "Today" because current IST is 08:00 AM
        heatshield.domain.TrackedAction kioskAction = assessment.actions().stream()
                .filter(a -> a.actionId().equals("ACT_WATER_KIOSKS"))
                .findFirst().orElseThrow();
        assertThat(kioskAction.deadline()).contains("Today").contains("before 10:00 AM");
    }

    @Test
    @DisplayName("IST deadline formats correctly for afternoon evaluations (Tomorrow)")
    void testDeadlineFormattingAfternoon() {
        // Current instantaneous: 14:30 IST (09:00 UTC)
        java.time.Instant afternoonUtc = java.time.Instant.parse("2026-10-10T09:00:00Z");
        java.time.Clock fixedClock = java.time.Clock.fixed(afternoonUtc, java.time.ZoneId.of("Asia/Kolkata"));
        AssessmentService fixedService = new AssessmentService(playbookService, repository, fixedClock);

        heatshield.domain.ForecastWindowSummary summary = new heatshield.domain.ForecastWindowSummary(
                afternoonUtc.plus(java.time.Duration.ofHours(24)),
                afternoonUtc.plus(java.time.Duration.ofHours(28)),
                42.0,
                108.0,
                HeatRiskTier.DANGER,
                java.util.Map.of()
        );

        WardAssessment assessment = fixedService.createAssessmentWithForecast(
                "WARD_12",
                "Ahmedabad Central",
                42.0,
                40.0,
                null,
                "LIVE_OPEN_METEO",
                summary,
                java.util.List.of()
        );

        heatshield.domain.TrackedAction kioskAction = assessment.actions().stream()
                .filter(a -> a.actionId().equals("ACT_WATER_KIOSKS"))
                .findFirst().orElseThrow();
        // Since it's already 14:30 IST (past 10:00 AM), deadline for water kiosks must be TOMORROW
        assertThat(kioskAction.deadline()).contains("Tomorrow").contains("before 10:00 AM");
    }
}
