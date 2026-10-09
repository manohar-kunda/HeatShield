package heatshield.dev;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import heatshield.handler.LambdaApiHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Lightweight local development server using JDK built-in com.sun.net.httpserver.
 * Allows running and testing the API locally without Docker or SAM local CLI.
 */
public class LocalDevServer {

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        LambdaApiHandler lambdaHandler = new LambdaApiHandler();

        server.createContext("/", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                // Read request body
                String body = "";
                try (InputStream is = exchange.getRequestBody()) {
                    body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }

                String method = exchange.getRequestMethod();
                String path = exchange.getRequestURI().getPath();
                String rawQuery = exchange.getRequestURI().getRawQuery();

                Map<String, String> queryParams = new HashMap<>();
                if (rawQuery != null && !rawQuery.isBlank()) {
                    for (String param : rawQuery.split("&")) {
                        String[] pair = param.split("=");
                        if (pair.length == 2) {
                            queryParams.put(pair[0], pair[1]);
                        }
                    }
                }

                APIGatewayV2HTTPEvent.RequestContext.Http http = APIGatewayV2HTTPEvent.RequestContext.Http.builder()
                        .withMethod(method)
                        .withPath(path)
                        .build();

                APIGatewayV2HTTPEvent.RequestContext context = APIGatewayV2HTTPEvent.RequestContext.builder()
                        .withHttp(http)
                        .build();

                APIGatewayV2HTTPEvent event = APIGatewayV2HTTPEvent.builder()
                        .withRequestContext(context)
                        .withBody(body)
                        .withQueryStringParameters(queryParams)
                        .build();

                APIGatewayV2HTTPResponse response = lambdaHandler.handleRequest(event, null);

                // Set headers
                if (response.getHeaders() != null) {
                    for (Map.Entry<String, String> header : response.getHeaders().entrySet()) {
                        exchange.getResponseHeaders().set(header.getKey(), header.getValue());
                    }
                }

                byte[] responseBytes = response.getBody() != null ? response.getBody().getBytes(StandardCharsets.UTF_8) : new byte[0];
                exchange.sendResponseHeaders(response.getStatusCode(), responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }
            }
        });

        server.setExecutor(null);
        System.out.println(">>> HeatShield Local Dev Server started on http://localhost:" + port);
        System.out.println(">>> Endpoints available: /api/health, /api/assessments, /api/forecast, /api/actions/{id}");
        server.start();
    }
}
