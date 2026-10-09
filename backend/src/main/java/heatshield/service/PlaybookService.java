package heatshield.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import heatshield.domain.ActionDefinition;
import heatshield.domain.HeatRiskTier;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service that loads and filters the authoritative Action Playbook.
 * Sourced from NDMA 2019 Guidelines and Ahmedabad Heat Action Plan (HAP).
 */
public class PlaybookService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String PLAYBOOK_RESOURCE_PATH = "/playbook/heat-actions.json";

    private final List<ActionDefinition> masterPlaybook;

    public PlaybookService() {
        this.masterPlaybook = loadMasterPlaybook();
    }

    public PlaybookService(List<ActionDefinition> customPlaybook) {
        this.masterPlaybook = customPlaybook != null ? customPlaybook : Collections.emptyList();
    }

    private static List<ActionDefinition> loadMasterPlaybook() {
        try (InputStream is = PlaybookService.class.getResourceAsStream(PLAYBOOK_RESOURCE_PATH)) {
            if (is == null) {
                throw new IllegalStateException("Playbook resource not found at " + PLAYBOOK_RESOURCE_PATH);
            }
            return MAPPER.readValue(is, new TypeReference<List<ActionDefinition>>() {});
        } catch (IOException e) {
            throw new IllegalStateException("Failed to parse heat actions playbook", e);
        }
    }

    public List<ActionDefinition> getMasterPlaybook() {
        return Collections.unmodifiableList(masterPlaybook);
    }

    /**
     * Filters actions applicable for a given risk tier.
     * Actions are included if the current tier's ordinal >= triggerTier's ordinal.
     */
    public List<ActionDefinition> getApplicableActions(HeatRiskTier currentTier) {
        if (currentTier == null || currentTier == HeatRiskTier.BELOW_THRESHOLD) {
            return Collections.emptyList();
        }

        return masterPlaybook.stream()
                .filter(action -> currentTier.ordinal() >= action.triggerTier().ordinal())
                .collect(Collectors.toList());
    }
}
