package heatshield.handler;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import heatshield.repository.InMemoryAssessmentRepository;
import heatshield.service.AssessmentService;
import heatshield.service.PlaybookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LambdaApiHandlerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private InMemoryAssessmentRepository repository;
    private LambdaApiHandler handler;

    @BeforeEach
    void setUp() {
        repository = new InMemoryAssessmentRepository();
        AssessmentService service = new AssessmentService(new PlaybookService(), repository);
        handler = new LambdaApiHandler(service, repository);
    }

    @Test
    @DisplayName("GET /api/health returns 200 UP")
    void testHealthEndpoint() throws Exception {
        APIGatewayV2HTTPEvent event = createEvent("GET", "/api/health", null, null);
        APIGatewayV2HTTPResponse response = handler.handleRequest(event, null);

        assertThat(response.getStatusCode()).isEqualTo(200);
        JsonNode json = MAPPER.readTree(response.getBody());
        assertThat(json.get("status").asText()).isEqualTo("UP");
        assertThat(json.get("service").asText()).isEqualTo("HeatShield Backend");
    }

    @Test
    @DisplayName("POST /api/assessments creates assessment and returns 201")
    void testCreateAssessmentEndpoint() throws Exception {
        String body = """
                {
                  "wardId": "WARD_TEST_01",
                  "wardName": "Connaught Hub",
                  "temperatureC": 36.0,
                  "humidityPct": 55.0
                }
                """;

        APIGatewayV2HTTPEvent event = createEvent("POST", "/api/assessments", body, null);
        APIGatewayV2HTTPResponse response = handler.handleRequest(event, null);

        assertThat(response.getStatusCode()).isEqualTo(201);
        JsonNode json = MAPPER.readTree(response.getBody());
        assertThat(json.get("wardId").asText()).isEqualTo("WARD_TEST_01");
        assertThat(json.get("operationalTier").asText()).isNotBlank();
        assertThat(json.get("actions").isArray()).isTrue();
    }

    @Test
    @DisplayName("PATCH /api/actions/{id} updates action status to COMPLETED")
    void testUpdateActionStatusEndpoint() throws Exception {
        // First create an assessment
        String createBody = """
                {
                  "wardId": "WARD_TEST_02",
                  "temperatureC": 38.0,
                  "humidityPct": 60.0
                }
                """;
        handler.handleRequest(createEvent("POST", "/api/assessments", createBody, null), null);

        // Update action
        String patchBody = """
                {
                  "status": "COMPLETED",
                  "note": "2 water tankers deployed on site"
                }
                """;
        Map<String, String> qp = Map.of("wardId", "WARD_TEST_02");
        APIGatewayV2HTTPEvent patchEvent = createEvent("PATCH", "/api/actions/ACT_WATER_KIOSKS", patchBody, qp);
        APIGatewayV2HTTPResponse response = handler.handleRequest(patchEvent, null);

        assertThat(response.getStatusCode()).isEqualTo(200);
        JsonNode json = MAPPER.readTree(response.getBody());
        assertThat(json.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(json.get("note").asText()).isEqualTo("2 water tankers deployed on site");
    }

    private APIGatewayV2HTTPEvent createEvent(String method, String path, String body, Map<String, String> queryParams) {
        APIGatewayV2HTTPEvent.RequestContext.Http http = APIGatewayV2HTTPEvent.RequestContext.Http.builder()
                .withMethod(method)
                .withPath(path)
                .build();

        APIGatewayV2HTTPEvent.RequestContext context = APIGatewayV2HTTPEvent.RequestContext.builder()
                .withHttp(http)
                .build();

        return APIGatewayV2HTTPEvent.builder()
                .withRequestContext(context)
                .withBody(body)
                .withQueryStringParameters(queryParams)
                .build();
    }
}
