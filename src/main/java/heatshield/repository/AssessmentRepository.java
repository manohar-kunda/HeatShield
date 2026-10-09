package heatshield.repository;

import heatshield.domain.ActionStatus;
import heatshield.domain.TrackedAction;
import heatshield.domain.WardAssessment;

import java.time.Instant;
import java.util.Optional;

/**
 * Persistence contract for Ward Assessments and Tracked Actions.
 */
public interface AssessmentRepository {

    void saveAssessment(WardAssessment assessment);

    Optional<WardAssessment> getLatestAssessment(String wardId);

    Optional<TrackedAction> updateActionStatus(String wardId, String actionId, ActionStatus status, String note, Instant timestamp);
}
