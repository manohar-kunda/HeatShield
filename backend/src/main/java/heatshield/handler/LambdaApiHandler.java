package heatshield.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import heatshield.domain.*;
import heatshield.repository.AssessmentRepository;
import heatshield.repository.DynamoDbAssessmentRepository;
import heatshield.repository.InMemoryAssessmentRepository;
import heatshield.service.AssessmentService;
import heatshield.service.ForecastIngestionService;
import heatshield.service.PlaybookService;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;
import java.time.Instant;
import java.util.*;

/**
 * Main AWS Lambda Request Handler for HTTP API Gateway.
 * Zero dependency-injection frameworks for low cold start latency (<300ms with SnapStart).
 */
public class LambdaApiHandler implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> {

    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());
    private static final Map<String, String> CORS_HEADERS = Map.of(
            "Content-Type", "application/json",
            "Access-Control-Allow-Origin", "*",
            "Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS",
            "Access-Control-Allow-Headers", "Content-Type, Authorization"
    );

    private static final Map<String, double[]> WARD_COORDINATES = Map.ofEntries(
            Map.entry("DEMO_AHMEDABAD", new double[]{23.0225, 72.5714}), // Ahmedabad Central (Kalupur)
            Map.entry("DEMO_DELHI", new double[]{28.6139, 77.2090}),     // Delhi Central (Connaught Place)
            Map.entry("DEMO_NAGPUR", new double[]{21.1458, 79.0882}),    // Nagpur Central (Sitabuldi)
            Map.entry("DEMO_HYDERABAD", new double[]{17.3616, 78.4747}), // Hyderabad Old City (Charminar)
            Map.entry("DEMO_KOLKATA", new double[]{22.6000, 88.3700}),   // Kolkata North (Shyambazar)
            Map.entry("REPLAY_AHMEDABAD_2010", new double[]{23.0225, 72.5714}), // Ahmedabad May 2010 Heatwave Replay
            Map.entry("WARD_12", new double[]{23.0225, 72.5714}),        // Legacy alias -> Ahmedabad
            Map.entry("WARD_01", new double[]{28.6139, 77.2090}),        // Legacy alias -> Delhi
            Map.entry("WARD_05", new double[]{21.1458, 79.0882}),        // Legacy alias -> Nagpur
            Map.entry("WARD_09", new double[]{17.3616, 78.4747}),        // Legacy alias -> Hyderabad
            Map.entry("WARD_03", new double[]{22.6000, 88.3700})         // Legacy alias -> Kolkata
    );

    private static final Map<String, String> WARD_NAMES = Map.ofEntries(
            Map.entry("DEMO_AHMEDABAD", "Demo ward: Ahmedabad Central (illustrative)"),
            Map.entry("DEMO_DELHI", "Demo ward: Delhi Central (illustrative)"),
            Map.entry("DEMO_NAGPUR", "Demo ward: Nagpur Central (illustrative)"),
            Map.entry("DEMO_HYDERABAD", "Demo ward: Hyderabad Old City (illustrative)"),
            Map.entry("DEMO_KOLKATA", "Demo ward: Kolkata North (illustrative)"),
            Map.entry("REPLAY_AHMEDABAD_2010", "Historical Replay: Ahmedabad May 2010 Heatwave (46.8°C)"),
            Map.entry("WARD_12", "Demo ward: Ahmedabad Central (illustrative)"),
            Map.entry("WARD_01", "Demo ward: Delhi Central (illustrative)"),
            Map.entry("WARD_05", "Demo ward: Nagpur Central (illustrative)"),
            Map.entry("WARD_09", "Demo ward: Hyderabad Old City (illustrative)"),
            Map.entry("WARD_03", "Demo ward: Kolkata North (illustrative)")
    );

    private final AssessmentService assessmentService;
    private final AssessmentRepository repository;
    private final ForecastIngestionService forecastService;

    public LambdaApiHandler() {
        String tableName = System.getenv("TABLE_NAME");
        String awsRegion = System.getenv("AWS_REGION");

        AssessmentRepository repo;
        if (tableName != null && !tableName.isBlank()) {
            DynamoDbClient ddbClient = DynamoDbClient.builder()
                    .region(awsRegion != null ? Region.of(awsRegion) : Region.AP_SOUTH_1)
                    .build();
            repo = new DynamoDbAssessmentRepository(ddbClient, tableName);
        } else {
            // Local fallback for offline / mock testing
            repo = new InMemoryAssessmentRepository();
        }

        this.repository = repo;
        this.assessmentService = new AssessmentService(new PlaybookService(), repo);
        this.forecastService = new ForecastIngestionService();
    }

    public LambdaApiHandler(AssessmentService assessmentService, AssessmentRepository repository) {
        this(assessmentService, repository, new ForecastIngestionService());
    }

    public LambdaApiHandler(AssessmentService assessmentService, AssessmentRepository repository, ForecastIngestionService forecastService) {
        this.assessmentService = assessmentService;
        this.repository = repository;
        this.forecastService = forecastService;
    }

    @Override
    public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context) {
        if (event == null || event.getRequestContext() == null || event.getRequestContext().getHttp() == null) {
            // Check if triggered by EventBridge Schedule or Warmup ping
            if (context != null) {
                context.getLogger().log("EventBridge or Warmup triggered: refreshing demo wards cache");
            }
            try {
                handleGetForecast(Map.of("wardId", "DEMO_AHMEDABAD", "live", "true"), "default");
            } catch (Exception ignored) {}
            return buildResponse(200, Map.of("status", "WARMUP_SUCCESS"));
        }

        String method = event.getRequestContext().getHttp().getMethod();
        String path = event.getRequestContext().getHttp().getPath();
        Map<String, String> headers = event.getHeaders() != null ? event.getHeaders() : Collections.emptyMap();
        String workspaceId = extractWorkspaceId(headers);

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return buildResponse(200, Map.of("status", "ok"));
        }

        try {
            if ("GET".equalsIgnoreCase(method) && path.endsWith("/api/health")) {
                return handleHealth();
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/assessments")) {
                return handleCreateAssessment(event.getBody(), workspaceId);
            } else if ("PATCH".equalsIgnoreCase(method) && path.contains("/api/actions/")) {
                return handleUpdateAction(path, event.getBody(), event.getQueryStringParameters(), workspaceId);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/api/forecast")) {
                return handleGetForecast(event.getQueryStringParameters(), workspaceId);
            } else {
                return buildResponse(404, Map.of("error", "Not found", "path", path));
            }
        } catch (IllegalArgumentException e) {
            return buildResponse(400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            if (context != null) {
                context.getLogger().log("Error processing request: " + e.getMessage());
            }
            return buildResponse(500, Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    private APIGatewayV2HTTPResponse handleHealth() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "UP");
        body.put("service", "HeatShield Backend");
        body.put("timestamp", Instant.now().toString());
        body.put("snapStartSupported", true);
        return buildResponse(200, body);
    }

    private APIGatewayV2HTTPResponse handleCreateAssessment(String requestBody, String workspaceId) throws Exception {
        if (requestBody == null || requestBody.isBlank()) {
            return buildResponse(400, Map.of("error", "Request body is required"));
        }

        JsonNode json = MAPPER.readTree(requestBody);
        String wardId = json.has("wardId") ? json.get("wardId").asText() : "DEMO_AHMEDABAD";
        
        // Enforce ward allowlist
        if (!WARD_COORDINATES.containsKey(wardId) && !wardId.startsWith("smoke-") && !wardId.equals("WARD_SMOKE_TEST")) {
            return buildResponse(400, Map.of("error", "Invalid or unauthorized wardId: " + wardId));
        }

        String wardName = json.has("wardName") ? json.get("wardName").asText() : WARD_NAMES.getOrDefault(wardId, wardId);

        if (!json.has("temperatureC") || !json.has("humidityPct")) {
            return buildResponse(400, Map.of("error", "Fields 'temperatureC' and 'humidityPct' are required"));
        }

        double tempC = json.get("temperatureC").asDouble();
        double rhPct = json.get("humidityPct").asDouble();
        Double departureC = json.has("imdDepartureC") && !json.get("imdDepartureC").isNull()
                ? json.get("imdDepartureC").asDouble()
                : null;

        WardAssessment assessment = assessmentService.createAssessment(
                wardId, wardName, tempC, rhPct, departureC, "MANUAL_INPUT"
        );

        if (repository instanceof DynamoDbAssessmentRepository ddbRepo) {
            ddbRepo.saveAssessment(workspaceId, assessment);
        }

        return buildResponse(201, assessment);
    }

    private APIGatewayV2HTTPResponse handleUpdateAction(String path, String requestBody, Map<String, String> queryParams, String workspaceId) throws Exception {
        String actionId = path.substring(path.lastIndexOf('/') + 1);
        String wardId = queryParams != null ? queryParams.get("wardId") : null;

        if (wardId == null || wardId.isBlank()) {
            return buildResponse(400, Map.of("error", "Query parameter 'wardId' is required"));
        }

        if (!WARD_COORDINATES.containsKey(wardId) && !wardId.startsWith("smoke-") && !wardId.equals("WARD_SMOKE_TEST")) {
            return buildResponse(400, Map.of("error", "Invalid or unauthorized wardId: " + wardId));
        }

        JsonNode json = MAPPER.readTree(requestBody);
        if (!json.has("status")) {
            return buildResponse(400, Map.of("error", "Field 'status' is required"));
        }

        ActionStatus status = ActionStatus.valueOf(json.get("status").asText().toUpperCase());
        String note = json.has("note") ? json.get("note").asText() : null;

        // Privacy & Abuse validation on note
        if (note != null) {
            if (note.length() > 200) {
                return buildResponse(400, Map.of("error", "Note exceeds maximum limit of 200 characters"));
            }
            // Check for PII phone numbers: sequence of 10 or more consecutive digits
            if (note.matches(".*\\d{10,}.*")) {
                return buildResponse(400, Map.of("error", "Privacy violation: Phone numbers and identity numbers are prohibited in action notes"));
            }
        }

        Optional<TrackedAction> updated;
        if (repository instanceof DynamoDbAssessmentRepository ddbRepo) {
            updated = ddbRepo.updateActionStatus(workspaceId, wardId, actionId, status, note, Instant.now());
        } else {
            updated = repository.updateActionStatus(wardId, actionId, status, note, Instant.now());
        }

        if (updated.isEmpty()) {
            return buildResponse(404, Map.of("error", "Action or Ward not found"));
        }

        return buildResponse(200, updated.get());
    }

    private APIGatewayV2HTTPResponse handleGetForecast(Map<String, String> queryParams, String workspaceId) {
        String wardId = queryParams != null ? queryParams.getOrDefault("wardId", "DEMO_AHMEDABAD") : "DEMO_AHMEDABAD";
        
        if (!WARD_COORDINATES.containsKey(wardId) && !wardId.startsWith("smoke-") && !wardId.equals("WARD_SMOKE_TEST")) {
            return buildResponse(400, Map.of("error", "Invalid or unauthorized wardId: " + wardId));
        }

        String demoMode = queryParams != null ? queryParams.get("demo") : null;
        boolean forceLive = queryParams != null && "true".equalsIgnoreCase(queryParams.get("live"));

        // Historical Replay Mode: Ahmedabad May 2010
        if ("REPLAY_AHMEDABAD_2010".equalsIgnoreCase(wardId)) {
            List<HourlyHeatIndexPoint> replayPoints = ForecastIngestionService.createAhmedabad2010ReplayFixture();
            ForecastWindowSummary replaySummary = ForecastIngestionService.computeWindowSummary(replayPoints);
            HourlyHeatIndexPoint peak = replayPoints.get(0);
            WardAssessment replayAssessment = assessmentService.createAssessmentWithForecast(
                    wardId,
                    "Historical Replay: Ahmedabad May 2010 Heatwave (46.8°C)",
                    peak.temperatureC(),
                    peak.humidityPct(),
                    6.8, // Severe heatwave departure
                    "HISTORICAL_REPLAY_2010",
                    replaySummary,
                    replayPoints
            );
            return buildResponse(200, replayAssessment);
        }

        // Demo fallback switch: ?demo=offline
        if ("offline".equalsIgnoreCase(demoMode)) {
            List<HourlyHeatIndexPoint> offlinePoints = ForecastIngestionService.createOfflineFixture();
            ForecastWindowSummary offlineSummary = ForecastIngestionService.computeWindowSummary(offlinePoints);
            HourlyHeatIndexPoint first = offlinePoints.get(0);
            WardAssessment offlineAssessment = assessmentService.createAssessmentWithForecast(
                    wardId,
                    WARD_NAMES.getOrDefault(wardId, "Ahmedabad Central (Offline Fixture)"),
                    first.temperatureC(),
                    first.humidityPct(),
                    null,
                    "OFFLINE_SAMPLE",
                    offlineSummary,
                    offlinePoints
            );
            return buildResponse(200, offlineAssessment);
        }

        Optional<WardAssessment> existing;
        if (repository instanceof DynamoDbAssessmentRepository ddbRepo) {
            existing = ddbRepo.getLatestAssessment(workspaceId, wardId);
        } else {
            existing = repository.getLatestAssessment(wardId);
        }

        // Demo fallback switch: ?demo=stale
        if ("stale".equalsIgnoreCase(demoMode) && existing.isPresent()) {
            return buildResponse(200, existing.get());
        }

        if (!forceLive && existing.isPresent()) {
            return buildResponse(200, existing.get());
        }

        double[] coords = WARD_COORDINATES.getOrDefault(wardId, new double[]{23.0225, 72.5714});
        double lat = coords[0];
        double lon = coords[1];
        String wardName = WARD_NAMES.getOrDefault(wardId, wardId);

        // Resilience Tier 1: Live fetch from Open-Meteo API
        try {
            List<HourlyHeatIndexPoint> points = forecastService.fetchHourlyForecast(lat, lon);
            ForecastWindowSummary summary = ForecastIngestionService.computeWindowSummary(points);
            HourlyHeatIndexPoint current = points.isEmpty() ? null : points.get(0);
            double currentTemp = current != null ? current.temperatureC() : 35.0;
            double currentRh = current != null ? current.humidityPct() : 50.0;

            WardAssessment liveAssessment = assessmentService.createAssessmentWithForecast(
                    wardId, wardName, currentTemp, currentRh, null, "LIVE_OPEN_METEO", summary, points
            );

            if (repository instanceof DynamoDbAssessmentRepository ddbRepo) {
                ddbRepo.saveAssessment(workspaceId, liveAssessment);
            }

            return buildResponse(200, liveAssessment);
        } catch (Exception fetchErr) {
            // Resilience Tier 2: Stale cached snapshot fallback from DynamoDB
            if (existing.isPresent()) {
                return buildResponse(200, existing.get());
            }

            // Resilience Tier 3: Deterministic bundled offline fixture
            List<HourlyHeatIndexPoint> offlinePoints = ForecastIngestionService.createOfflineFixture();
            ForecastWindowSummary offlineSummary = ForecastIngestionService.computeWindowSummary(offlinePoints);
            HourlyHeatIndexPoint first = offlinePoints.get(0);

            WardAssessment offlineAssessment = assessmentService.createAssessmentWithForecast(
                    wardId,
                    wardName,
                    first.temperatureC(),
                    first.humidityPct(),
                    null,
                    "OFFLINE_SAMPLE",
                    offlineSummary,
                    offlinePoints
            );
            return buildResponse(200, offlineAssessment);
        }
    }

    private static String extractWorkspaceId(Map<String, String> headers) {
        if (headers == null) return "default";
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if ("x-workspace-id".equalsIgnoreCase(entry.getKey())) {
                String val = entry.getValue();
                if (val != null && val.trim().matches("^[a-zA-Z0-9_-]{3,64}$")) {
                    return val.trim();
                }
            }
        }
        return "default";
    }

    private static APIGatewayV2HTTPResponse buildResponse(int statusCode, Object body) {
        try {
            return APIGatewayV2HTTPResponse.builder()
                    .withStatusCode(statusCode)
                    .withHeaders(CORS_HEADERS)
                    .withBody(MAPPER.writeValueAsString(body))
                    .build();
        } catch (Exception e) {
            return APIGatewayV2HTTPResponse.builder()
                    .withStatusCode(500)
                    .withHeaders(CORS_HEADERS)
                    .withBody("{\"error\":\"JSON serialization failure\"}")
                    .build();
        }
    }
}
