package heatshield.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import heatshield.domain.ActionStatus;
import heatshield.domain.TrackedAction;
import heatshield.domain.WardAssessment;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Production DynamoDB implementation for AWS Lambda.
 * Single-table design:
 * PK = WARD#<wardId>
 * SK = LATEST
 */
public class DynamoDbAssessmentRepository implements AssessmentRepository {

    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private final DynamoDbClient client;
    private final String tableName;

    public DynamoDbAssessmentRepository(DynamoDbClient client, String tableName) {
        this.client = client;
        this.tableName = tableName;
    }

    @Override
    public void saveAssessment(WardAssessment assessment) {
        saveAssessment("default", assessment);
    }

    public void saveAssessment(String workspaceId, WardAssessment assessment) {
        String ws = normalizeWorkspaceId(workspaceId);
        try {
            String jsonPayload = MAPPER.writeValueAsString(assessment);

            Map<String, AttributeValue> item = new HashMap<>();
            item.put("PK", AttributeValue.builder().s("WS#" + ws + "#WARD#" + assessment.wardId()).build());
            item.put("SK", AttributeValue.builder().s("LATEST").build());
            item.put("assessmentId", AttributeValue.builder().s(assessment.assessmentId()).build());
            item.put("wardId", AttributeValue.builder().s(assessment.wardId()).build());
            item.put("workspaceId", AttributeValue.builder().s(ws).build());
            item.put("operationalTier", AttributeValue.builder().s(assessment.operationalTier().name()).build());
            item.put("payload", AttributeValue.builder().s(jsonPayload).build());
            // Expire cached snapshot in 7 days (604,800 seconds)
            long expiresAt = Instant.now().getEpochSecond() + (7 * 24 * 3600);
            item.put("expiresAt", AttributeValue.builder().n(String.valueOf(expiresAt)).build());

            PutItemRequest request = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build();

            client.putItem(request);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize WardAssessment for DynamoDB", e);
        }
    }

    @Override
    public Optional<WardAssessment> getLatestAssessment(String wardId) {
        return getLatestAssessment("default", wardId);
    }

    public Optional<WardAssessment> getLatestAssessment(String workspaceId, String wardId) {
        String ws = normalizeWorkspaceId(workspaceId);
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("WS#" + ws + "#WARD#" + wardId).build());
        key.put("SK", AttributeValue.builder().s("LATEST").build());

        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build();

        GetItemResponse response = client.getItem(request);
        if (!response.hasItem()) {
            return Optional.empty();
        }

        AttributeValue payloadAttr = response.item().get("payload");
        if (payloadAttr == null || payloadAttr.s() == null) {
            return Optional.empty();
        }

        try {
            WardAssessment assessment = MAPPER.readValue(payloadAttr.s(), WardAssessment.class);
            return Optional.of(assessment);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize WardAssessment from DynamoDB payload", e);
        }
    }

    @Override
    public Optional<TrackedAction> updateActionStatus(String wardId, String actionId, ActionStatus status, String note, Instant timestamp) {
        return updateActionStatus("default", wardId, actionId, status, note, timestamp);
    }

    public Optional<TrackedAction> updateActionStatus(String workspaceId, String wardId, String actionId, ActionStatus status, String note, Instant timestamp) {
        Optional<WardAssessment> latestOpt = getLatestAssessment(workspaceId, wardId);
        if (latestOpt.isEmpty()) {
            return Optional.empty();
        }

        WardAssessment current = latestOpt.get();
        InMemoryAssessmentRepository memoryUpdater = new InMemoryAssessmentRepository();
        memoryUpdater.saveAssessment(current);

        Optional<TrackedAction> updatedAction = memoryUpdater.updateActionStatus(wardId, actionId, status, note, timestamp);
        if (updatedAction.isPresent()) {
            memoryUpdater.getLatestAssessment(wardId).ifPresent(updated -> saveAssessment(workspaceId, updated));
        }

        return updatedAction;
    }

    private static String normalizeWorkspaceId(String raw) {
        if (raw == null || raw.isBlank()) {
            return "default";
        }
        String trimmed = raw.trim();
        if (trimmed.matches("^[a-zA-Z0-9_-]{3,64}$")) {
            return trimmed;
        }
        return "default";
    }
}
