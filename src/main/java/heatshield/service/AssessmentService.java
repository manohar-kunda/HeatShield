package heatshield.service;

import heatshield.domain.*;
import heatshield.repository.AssessmentRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Core Assessment Planner service.
 * Coordinates Rothfusz computation, IMD signal evaluation, composite tiering, and action generation.
 */
public class AssessmentService {

    private final PlaybookService playbookService;
    private final AssessmentRepository repository;

    public AssessmentService(PlaybookService playbookService, AssessmentRepository repository) {
        this.playbookService = playbookService;
        this.repository = repository;
    }

    public WardAssessment createAssessment(
            String wardId,
            String wardName,
            double tempC,
            double rhPct,
            Double imdDepartureC,
            String dataSource
    ) {
        // 1. Calculate NWS Rothfusz Heat Index
        HeatIndexResult hiResult = RothfuszCalculator.calculate(tempC, rhPct);

        // 2. Evaluate IMD signal (Plains criteria)
        ImdHeatwaveCategory imdCat = ImdHeatwaveCategory.evaluatePlains(tempC, imdDepartureC);

        // 3. Determine composite operational tier (higher of both)
        HeatRiskTier operationalTier = WardAssessment.determineCompositeTier(hiResult.riskTier(), imdCat);

        // 4. Retrieve applicable actions
        List<ActionDefinition> definitions = playbookService.getApplicableActions(operationalTier);

        Instant now = Instant.now();
        List<TrackedAction> trackedActions = new ArrayList<>();
        for (ActionDefinition def : definitions) {
            trackedActions.add(new TrackedAction(
                    def.actionId(),
                    def.title(),
                    def.hindiTitle(),
                    def.ownerRole(),
                    def.targetGroup(),
                    def.timeWindow(),
                    def.priority(),
                    def.sourceReference(),
                    ActionStatus.PENDING,
                    null,
                    now
            ));
        }

        WardAssessment assessment = new WardAssessment(
                UUID.randomUUID().toString(),
                wardId,
                wardName != null ? wardName : wardId,
                hiResult,
                imdCat,
                operationalTier,
                trackedActions,
                dataSource != null ? dataSource : "MANUAL_INPUT",
                now
        );

        repository.saveAssessment(assessment);
        return assessment;
    }
}
