package heatshield.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import heatshield.domain.ActionStatus;
import heatshield.domain.TrackedAction;
import heatshield.domain.WardAssessment;
import heatshield.repository.AssessmentRepository;
import heatshield.repository.DynamoDbAssessmentRepository;
import heatshield.repository.InMemoryAssessmentRepository;
import heatshield.service.AssessmentService;
import heatshield.service.PlaybookService;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

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

    private final AssessmentService assessmentService;
    private final AssessmentRepository repository;

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
    }

    public LambdaApiHandler(AssessmentService assessmentService, AssessmentRepository repository) {
        this.assessmentService = assessmentService;
        this.repository = repository;
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
        Optional<WardAssessment> latest = repository.getLatestAssessment(wardId);

        if (latest.isPresent()) {
            return buildResponse(200, latest.get());
        }

        // Return baseline offline sample if no assessment stored yet
        WardAssessment sample = assessmentService.createAssessment(
                wardId,
                "Demo Ward - Transit & Market Zone",
                34.0,
                55.0,
                null,
                "OFFLINE_SAMPLE"
        );
        return buildResponse(200, sample);
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
