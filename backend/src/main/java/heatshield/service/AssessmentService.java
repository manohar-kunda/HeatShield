package heatshield.service;

import heatshield.domain.*;
import heatshield.repository.AssessmentRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Core Assessment Planner service.
 * Coordinates Rothfusz computation, IMD signal evaluation, composite tiering, and action generation.
 */
public class AssessmentService {

    public static final java.time.ZoneId IST_ZONE = java.time.ZoneId.of("Asia/Kolkata");
    private static final java.time.format.DateTimeFormatter DAY_MONTH_FMT = 
            java.time.format.DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);

    private final PlaybookService playbookService;
    private final AssessmentRepository repository;
    private final java.time.Clock clock;

    public AssessmentService(PlaybookService playbookService, AssessmentRepository repository) {
        this(playbookService, repository, java.time.Clock.system(IST_ZONE));
    }

    public AssessmentService(PlaybookService playbookService, AssessmentRepository repository, java.time.Clock clock) {
        this.playbookService = playbookService;
        this.repository = repository;
        this.clock = clock;
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
        // 1. Calculate current instantaneous NWS Rothfusz Heat Index
        HeatIndexResult hiResult = RothfuszCalculator.calculate(tempC, rhPct);

        // 2. Evaluate current instantaneous IMD signal (Plains criteria)
        ImdHeatwaveCategory imdCat = ImdHeatwaveCategory.evaluatePlains(tempC, imdDepartureC);

        // 3. Determine instantaneous composite tier
        HeatRiskTier instantaneousTier = WardAssessment.determineCompositeTier(hiResult.riskTier(), imdCat);

        // 4. Determine operational tier: PEAK composite tier across 72-hour forecast horizon if available
        HeatRiskTier operationalTier;
        if (forecastSummary != null && forecastSummary.peakTier() != null) {
            operationalTier = forecastSummary.peakTier().ordinal() > instantaneousTier.ordinal()
                    ? forecastSummary.peakTier()
                    : instantaneousTier;
        } else {
            operationalTier = instantaneousTier;
        }

        // 5. Retrieve applicable actions based on OPERATIONAL tier
        List<ActionDefinition> definitions = playbookService.getApplicableActions(operationalTier);

        Instant now = clock.instant();
        List<TrackedAction> trackedActions = new ArrayList<>();
        for (ActionDefinition def : definitions) {
            String deadline = computeActionDeadline(def.timeWindow(), forecastSummary, now, clock.getZone());
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
        return computeActionDeadline(timeWindow, summary, Instant.now(), IST_ZONE);
    }

    public static String computeActionDeadline(
            String timeWindow,
            ForecastWindowSummary summary,
            Instant referenceInstant,
            java.time.ZoneId zone
    ) {
        if (referenceInstant == null) {
            referenceInstant = Instant.now();
        }
        if (zone == null) {
            zone = IST_ZONE;
        }

        java.time.ZonedDateTime nowIst = referenceInstant.atZone(zone);

        if ("IMMEDIATE".equalsIgnoreCase(timeWindow)) {
            java.time.ZonedDateTime due = nowIst.plusMinutes(30);
            return String.format(Locale.ENGLISH, "Immediate (within 30 mins, by %02d:%02d)",
                    due.getHour(), due.getMinute());
        }

        if ("BEFORE_10_AM".equalsIgnoreCase(timeWindow)) {
            if (nowIst.getHour() < 10) {
                return nowIst.format(DAY_MONTH_FMT) + ", before 10:00 AM IST";
            } else {
                java.time.ZonedDateTime nextDay = nowIst.plusDays(1);
                return nextDay.format(DAY_MONTH_FMT) + ", before 10:00 AM IST";
            }
        }

        if ("BEFORE_11_AM".equalsIgnoreCase(timeWindow)) {
            if (nowIst.getHour() < 11) {
                return nowIst.format(DAY_MONTH_FMT) + ", before 11:00 AM IST";
            } else {
                java.time.ZonedDateTime nextDay = nowIst.plusDays(1);
                return nextDay.format(DAY_MONTH_FMT) + ", before 11:00 AM IST";
            }
        }

        if ("PEAK_HOURS_12_TO_16".equalsIgnoreCase(timeWindow)) {
            if (summary != null && summary.peakWindowStart() != null) {
                java.time.ZonedDateTime peakStartIst = summary.peakWindowStart().atZone(zone);
                return "Enforce before peak thermal stress (" + peakStartIst.format(DAY_MONTH_FMT) + " ~ " +
                        String.format(Locale.ENGLISH, "%02d:00", peakStartIst.getHour()) + ")";
            }
            return "Enforce prior to peak hours (12:00 - 16:00)";
        }

        return "Complete within operational shift";
    }
}
