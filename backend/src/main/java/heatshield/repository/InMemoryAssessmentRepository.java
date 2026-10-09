package heatshield.repository;

import heatshield.domain.ActionStatus;
import heatshield.domain.TrackedAction;
import heatshield.domain.WardAssessment;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe In-Memory repository implementation for local tests and offline mode.
 */
public class InMemoryAssessmentRepository implements AssessmentRepository {

    private final Map<String, WardAssessment> assessmentsByWard = new ConcurrentHashMap<>();

    @Override
    public void saveAssessment(WardAssessment assessment) {
        if (assessment != null && assessment.wardId() != null) {
            assessmentsByWard.put(assessment.wardId(), assessment);
        }
    }

    @Override
    public Optional<WardAssessment> getLatestAssessment(String wardId) {
        return Optional.ofNullable(assessmentsByWard.get(wardId));
    }

    @Override
    public Optional<TrackedAction> updateActionStatus(String wardId, String actionId, ActionStatus status, String note, Instant timestamp) {
        WardAssessment current = assessmentsByWard.get(wardId);
        if (current == null) {
            return Optional.empty();
        }

        List<TrackedAction> updatedList = new ArrayList<>();
        TrackedAction matchedAction = null;

        for (TrackedAction act : current.actions()) {
            if (act.actionId().equals(actionId)) {
                matchedAction = act.withStatus(status, note, timestamp);
                updatedList.add(matchedAction);
            } else {
                updatedList.add(act);
            }
        }

        if (matchedAction != null) {
            WardAssessment updatedAssessment = new WardAssessment(
                    current.assessmentId(),
                    current.wardId(),
                    current.wardName(),
                    current.heatIndex(),
                    current.imdCategory(),
                    current.operationalTier(),
                    updatedList,
                    current.dataSource(),
                    current.timestamp()
            );
            assessmentsByWard.put(wardId, updatedAssessment);
            return Optional.of(matchedAction);
        }

        return Optional.empty();
    }

    public void clear() {
        assessmentsByWard.clear();
    }
}
