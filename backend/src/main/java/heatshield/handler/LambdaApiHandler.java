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

    private static final Map<String, double[]> WARD_COORDINATES = Map.of(
            "WARD_12", new double[]{23.0225, 72.5714}, // Ahmedabad Central (Kalupur)
            "WARD_01", new double[]{28.6139, 77.2090}, // Delhi Central (Connaught Place)
            "WARD_05", new double[]{21.1458, 79.0882}, // Nagpur Central (Sitabuldi)
            "WARD_09", new double[]{17.3616, 78.4747}, // Hyderabad Old City (Charminar)
            "WARD_03", new double[]{22.6000, 88.3700}  // Kolkata North (Shyambazar)
    );

    private static final Map<String, String> WARD_NAMES = Map.of(
            "WARD_12", "Ahmedabad Central (Kalupur Market)",
            "WARD_01", "Delhi Central (Connaught Place)",
            "WARD_05", "Nagpur Central (Sitabuldi Hub)",
            "WARD_09", "Hyderabad Old City (Charminar Zone)",
            "WARD_03", "Kolkata North (Shyambazar Market)"
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
            return buildResponse(400, Map.of("error", "Malformed request"));
        }

        String method = event.getRequestContext().getHttp().getMethod();
        String path = event.getRequestContext().getHttp().getPath();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return buildResponse(200, Map.of("status", "ok"));
        }

        try {
            if ("GET".equalsIgnoreCase(method) && path.endsWith("/api/health")) {
                return handleHealth();
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/assessments")) {
                return handleCreateAssessment(event.getBody());
            } else if ("PATCH".equalsIgnoreCase(method) && path.contains("/api/actions/")) {
                return handleUpdateAction(path, event.getBody(), event.getQueryStringParameters());
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/api/forecast")) {
                return handleGetForecast(event.getQueryStringParameters());
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

    private APIGatewayV2HTTPResponse handleCreateAssessment(String requestBody) throws Exception {
        if (requestBody == null || requestBody.isBlank()) {
            return buildResponse(400, Map.of("error", "Request body is required"));
        }

        JsonNode json = MAPPER.readTree(requestBody);
        String wardId = json.has("wardId") ? json.get("wardId").asText() : "WARD_DEFAULT";
        String wardName = json.has("wardName") ? json.get("wardName").asText() : wardId;

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

        return buildResponse(201, assessment);
    }

    private APIGatewayV2HTTPResponse handleUpdateAction(String path, String requestBody, Map<String, String> queryParams) throws Exception {
        String actionId = path.substring(path.lastIndexOf('/') + 1);
        String wardId = queryParams != null ? queryParams.get("wardId") : null;

        if (wardId == null || wardId.isBlank()) {
            return buildResponse(400, Map.of("error", "Query parameter 'wardId' is required"));
        }

        JsonNode json = MAPPER.readTree(requestBody);
        if (!json.has("status")) {
            return buildResponse(400, Map.of("error", "Field 'status' is required"));
        }

        ActionStatus status = ActionStatus.valueOf(json.get("status").asText().toUpperCase());
        String note = json.has("note") ? json.get("note").asText() : null;

        Optional<TrackedAction> updated = repository.updateActionStatus(wardId, actionId, status, note, Instant.now());
        if (updated.isEmpty()) {
            return buildResponse(404, Map.of("error", "Action or Ward not found"));
        }

        return buildResponse(200, updated.get());
    }

    private APIGatewayV2HTTPResponse handleGetForecast(Map<String, String> queryParams) {
        String wardId = queryParams != null ? queryParams.getOrDefault("wardId", "WARD_12") : "WARD_12";
        boolean forceLive = queryParams != null && ("true".equalsIgnoreCase(queryParams.get("live")) || queryParams.containsKey("lat"));

        // If not forced and we already have a saved/created assessment in the repository, return it
        Optional<WardAssessment> existing = repository.getLatestAssessment(wardId);
        if (!forceLive && existing.isPresent()) {
            return buildResponse(200, existing.get());
        }

        // Coordinates resolution
        Double lat = null;
        Double lon = null;
        if (queryParams != null && queryParams.containsKey("lat") && queryParams.containsKey("lon")) {
            try {
                lat = Double.parseDouble(queryParams.get("lat"));
                lon = Double.parseDouble(queryParams.get("lon"));
            } catch (NumberFormatException ignored) {}
        }
        if (lat == null || lon == null) {
            double[] coords = WARD_COORDINATES.getOrDefault(wardId, new double[]{23.0225, 72.5714});
            lat = coords[0];
            lon = coords[1];
        }

        String wardName = queryParams != null && queryParams.containsKey("wardName")
                ? queryParams.get("wardName")
                : WARD_NAMES.getOrDefault(wardId, wardId);

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
                    wardName != null ? wardName : "Ahmedabad Central (Offline Fixture)",
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
