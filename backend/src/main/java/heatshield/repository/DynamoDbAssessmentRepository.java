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
        try {
            String jsonPayload = MAPPER.writeValueAsString(assessment);

            Map<String, AttributeValue> item = new HashMap<>();
            item.put("PK", AttributeValue.builder().s("WARD#" + assessment.wardId()).build());
            item.put("SK", AttributeValue.builder().s("LATEST").build());
            item.put("assessmentId", AttributeValue.builder().s(assessment.assessmentId()).build());
            item.put("wardId", AttributeValue.builder().s(assessment.wardId()).build());
            item.put("operationalTier", AttributeValue.builder().s(assessment.operationalTier().name()).build());
            item.put("payload", AttributeValue.builder().s(jsonPayload).build());
            // Expire cached snapshot in 4 hours
            long expiresAt = Instant.now().getEpochSecond() + (4 * 3600);
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
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("WARD#" + wardId).build());
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
        Optional<WardAssessment> latestOpt = getLatestAssessment(wardId);
        if (latestOpt.isEmpty()) {
            return Optional.empty();
        }

        WardAssessment current = latestOpt.get();
        InMemoryAssessmentRepository memoryUpdater = new InMemoryAssessmentRepository();
        memoryUpdater.saveAssessment(current);

        Optional<TrackedAction> updatedAction = memoryUpdater.updateActionStatus(wardId, actionId, status, note, timestamp);
        if (updatedAction.isPresent()) {
            memoryUpdater.getLatestAssessment(wardId).ifPresent(this::saveAssessment);
        }

        return updatedAction;
    }
}
