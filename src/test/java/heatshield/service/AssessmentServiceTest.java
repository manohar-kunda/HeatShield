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
}
