package heatshield.service;

import heatshield.domain.ActionDefinition;
import heatshield.domain.HeatRiskTier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlaybookServiceTest {

    private final PlaybookService service = new PlaybookService();

    @Test
    @DisplayName("Master playbook loads all 5 official action definitions from JSON")
    void testPlaybookLoadsSuccessfully() {
        List<ActionDefinition> master = service.getMasterPlaybook();
        assertThat(master).hasSize(5);

        ActionDefinition first = master.get(0);
        assertThat(first.actionId()).isEqualTo("ACT_WATER_KIOSKS");
        assertThat(first.hindiTitle()).isNotBlank();
        assertThat(first.sourceReference()).contains("NDMA");
    }

    @Test
    @DisplayName("Below Threshold yields zero triggered actions")
    void testBelowThresholdYieldsNoActions() {
        List<ActionDefinition> actions = service.getApplicableActions(HeatRiskTier.BELOW_THRESHOLD);
        assertThat(actions).isEmpty();
    }

    @Test
    @DisplayName("Caution tier triggers 1 action (water kiosks)")
    void testCautionTierActions() {
        List<ActionDefinition> actions = service.getApplicableActions(HeatRiskTier.CAUTION);
        assertThat(actions).hasSize(1);
        assertThat(actions.get(0).actionId()).isEqualTo("ACT_WATER_KIOSKS");
    }

    @Test
    @DisplayName("Extreme Danger triggers all 5 actions")
    void testExtremeDangerActions() {
        List<ActionDefinition> actions = service.getApplicableActions(HeatRiskTier.EXTREME_DANGER);
        assertThat(actions).hasSize(5);
    }
}
