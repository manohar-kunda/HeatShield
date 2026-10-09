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
        return createAssessmentWithForecast(wardId, wardName, tempC, rhPct, imdDepartureC, dataSource, null, List.of());
    }

    public WardAssessment createAssessmentWithForecast(
            String wardId,
            String wardName,
            double tempC,
            double rhPct,
            Double imdDepartureC,
            String dataSource,
            ForecastWindowSummary forecastSummary,
            List<HourlyHeatIndexPoint> hourlyForecast
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
            String deadline = computeActionDeadline(def.timeWindow(), forecastSummary);
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
                    now,
                    deadline
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
                now,
                forecastSummary,
                hourlyForecast != null ? hourlyForecast : List.of()
        );

        repository.saveAssessment(assessment);
        return assessment;
    }

    public static String computeActionDeadline(String timeWindow, ForecastWindowSummary summary) {
        if ("IMMEDIATE".equalsIgnoreCase(timeWindow)) {
            return "Immediate (within 30 mins)";
        } else if ("BEFORE_10_AM".equalsIgnoreCase(timeWindow)) {
            return "Complete before 10:00 AM";
        } else if ("BEFORE_11_AM".equalsIgnoreCase(timeWindow)) {
            return "Complete before 11:00 AM";
        } else if ("PEAK_HOURS_12_TO_16".equalsIgnoreCase(timeWindow)) {
            if (summary != null && summary.peakWindowStart() != null) {
                return "Enforce prior to peak thermal stress window";
            }
            return "Enforce during peak hours (12:00 - 16:00)";
        }
        return "Complete within operational shift";
    }
}
