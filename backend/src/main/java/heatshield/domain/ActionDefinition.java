package heatshield.domain;

/**
 * Immutable operational action representation parsed from the official playbook.
 */
public record ActionDefinition(
        String actionId,
        String title,
        String hindiTitle,
        HeatRiskTier triggerTier,
        String ownerRole,
        String targetGroup,
        String timeWindow,
        String priority,
        String sourceReference
) {
}
