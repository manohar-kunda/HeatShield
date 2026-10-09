package heatshield.domain;

import java.time.Instant;

/**
 * Mutable/Trackable state of an operational action assigned to a ward.
 */
public record TrackedAction(
        String actionId,
        String title,
        String hindiTitle,
        String ownerRole,
        String targetGroup,
        String timeWindow,
        String priority,
        String sourceReference,
        ActionStatus status,
        String note,
        Instant updatedAt
) {
    public TrackedAction withStatus(ActionStatus newStatus, String newNote, Instant now) {
        return new TrackedAction(
                actionId,
                title,
                hindiTitle,
                ownerRole,
                targetGroup,
                timeWindow,
                priority,
                sourceReference,
                newStatus,
                newNote != null ? newNote : note,
                now
        );
    }
}
