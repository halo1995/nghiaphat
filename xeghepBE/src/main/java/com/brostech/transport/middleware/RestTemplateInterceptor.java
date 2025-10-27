package com.brostech.transport.middleware;

import com.brostech.transport.common.factory.LoggingFactory;
import com.brostech.transport.common.factory.MaskingUtils;
import com.brostech.transport.common.util.JWTUtils;
import com.brostech.transport.common.util.Utils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class RestTemplateInterceptor implements ClientHttpRequestInterceptor {

    private static final Logger log = LoggingFactory.getLogger(RestTemplateInterceptor.class);

    private static final String CONTENT_TYPE = "Content-Type";

    @Value("${spring.application.code}")
    private String applicationCode;

    @Value("${spring.application.name}")
    private String applicationName;

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {

        long start = System.nanoTime();

        String username = getUsername();

        logRequest(username, request, body);
        ClientHttpResponse response = null;
        try {
            response = execution.execute(request, body);
            /*
            Body của response sử dụng InputStream nên khi sử dụng thì dữ liệu sẽ null, nên cần tạo 1 class mới để clone data này
            mỗi khi sử dụng thì sẽ không mất dữ liệu Body trong Input Stream
             */
            response = new BufferingClientHttpResponseWrapper(response);
        } catch (Exception e) {
            log.error("[MONITOR][REST_TEMPLATE_INTERCEPTOR] Exception: {}", e.getMessage());
            throw e;
        }
        logResponse(username, request, body, response, start);

        // Trả về response
        return response;
    }

    private void logRequest(String username, HttpRequest request, byte[] body) {
        if (request != null) {
            try {
                String traceId = MDC.get("traceId");
                if (!StringUtils.isBlank(traceId)) {
                    request.getHeaders().add("mc-trace-id", traceId);
                }
                request.getHeaders().add("mc-src-system", applicationCode);
                request.getHeaders().add("mc-name-system", applicationName);

                Object requestPayload = getRequestPayload(request, body);

                log.info("[MONITOR][REQUEST_CLIENT] username={} URL={}, METHOD={}, HEADERS={}, RequestPayload={}", username, request.getURI(), request.getMethod().name(), request.getHeaders(), requestPayload);
            } catch (Exception e) {
                log.error("[MONITOR][REQUEST_CLIENT] username={} URL={}, METHOD={}, Exception: {}", username, request.getURI(), request.getMethod().name(), e.getMessage());
            }
        }
    }

    private void logResponse(String username, HttpRequest request, byte[] body, ClientHttpResponse response, long start) {
        if (response != null) {
            try {

                Object requestPayload = getRequestPayload(request, body);

                String responsePayload = "fs";
                if (!(response.getHeaders().get(CONTENT_TYPE) != null && Utils.IMAGE_DOC_CONTENT_TYPES.contains(Objects.requireNonNull(response.getHeaders().get(CONTENT_TYPE)).get(0)))) {
                    byte[] responseBody = StreamUtils.copyToByteArray(response.getBody());
                    responsePayload = new String(responseBody);
                }

                long elapsed = System.nanoTime() - start; // Tính theo nano second
                String duration = String.format("%.3f", elapsed / 1000000.0);

                log.info("[MONITOR][RESPONSE_CLIENT] username={} URL={}, METHOD={}, STATUS={}, DURATION={}, HEADERS={}, RequestPayload={}, ResponsePayload={}", username, request.getURI(), request.getMethod().name(), response.getStatusCode().value(), duration, response.getHeaders(), requestPayload, responsePayload);
            } catch (Exception e) {
                log.error("[MONITOR][RESPONSE_CLIENT] username={} URL={}, METHOD={}, Exception: {}", username, request.getURI(), request.getMethod().name(), e.getMessage());
            }
        }
    }

    private String getUsername(){
        var username = JWTUtils.getUsername();
        // Nếu không có username hoặc thông tin username không phải là SDT thì sẽ set lại giá trị mặc định
        if(StringUtils.isBlank(username)){
            username = "<EMPTY>";
        }
        return username;
    }

    public static String convertMapToUrlParams(Map<String, Object> paramMap) {
        // Sử dụng Java Stream để kết hợp các cặp key=value thành một chuỗi

        return paramMap.entrySet().stream().map(entry -> entry.getKey() + "=" + entry.getValue()).collect(Collectors.joining("&"));
    }

    public static Map<String, String> convertUrlParamsToMap(String urlParams) {
        Map<String, String> paramMap = new HashMap<>();
        try {
            // Tách các cặp key=value bằng "&"
            String[] keyValuePairs = urlParams.split("&");
            // Duyệt qua từng cặp key=value và thêm vào map
            for (String pair : keyValuePairs) {
                String[] entry = pair.split("=");
                if (entry.length == 2) {
                    paramMap.put(entry[0], entry[1]);
                } else {
                    // Xử lý trường hợp key không có giá trị
                    paramMap.put(entry[0], null);
                }
            }
        } catch (Exception e) {
            // do nothing
        }
        return paramMap;
    }

    private Object getRequestPayload(HttpRequest request, byte[] body) {
        Object requestPayload = null;
        var contentType = request.getHeaders().getContentType();
        if (contentType != null) {
            if (contentType.getSubtype().equals("form-data")) {
                var parameters = contentType.getParameters();
                String boundary = parameters.get("boundary");
                requestPayload = parseMultipartFormData(boundary, new String(body, StandardCharsets.UTF_8));
            } else if (contentType.getSubtype().equals("x-www-form-urlencoded")) {
                String inputData = new String(body, StandardCharsets.UTF_8);
                Map<String, Object> keyValuePairs = MaskingUtils.maskingMapData(convertUrlParamsToMap(inputData));
                requestPayload = convertMapToUrlParams(keyValuePairs);
            }
        }

        if (requestPayload == null) {
            requestPayload = new String(body, StandardCharsets.UTF_8);
        }
        return requestPayload;
    }

    private Map<String, String> parseMultipartFormData(String boundary, String multipartFormData) {
        Map<String, String> map = new HashMap<>();
        try {
            String[] datas = multipartFormData.split("--" + boundary);
            for (String data : datas) {
                String key = extractKeyFormData(data);
                if (StringUtils.isNotBlank(data) && data.contains("Content-Disposition")) {
                    String value = extractValueFormData(data);
                    map.put(key, value);
                }
            }
        } catch (Exception e) {
            log.info("[MONITOR] parseMultipartFormData exception: {}", e.getMessage());
        }
        return map;
    }

    private String extractKeyFormData(String multipartFormData) {
        try {
            Pattern pattern = Pattern.compile("(?<=name=\")(.*?)(?=\")");
            Matcher matcher = pattern.matcher(multipartFormData);
            while (matcher.find()) {
                String fieldName = matcher.group(1);
                return fieldName;
            }
        } catch (Exception e) {
            return "";
        }
        return "";
    }

    private String extractValueFormData(String multipartFormData) {
        try {
            String fileName = extractFilenameFormData(multipartFormData);
            if (StringUtils.isBlank(fileName)) {
                List<String> dataSplits = Arrays.asList(multipartFormData.split("\n"));
                String value = dataSplits.get(dataSplits.size() - 1);
                if (StringUtils.isNotBlank(value)) {
                    value = value.replaceAll("([\r\n\t\"])", "");
                    return value;
                }
            } else {
                return fileName;
            }
        } catch (Exception e) {
            return "";
        }
        return "";
    }

    private String extractFilenameFormData(String multipartFormData) {
        try {
            Pattern pattern = Pattern.compile("(?<=filename=\")(.*?)(?=\")");
            Matcher matcher = pattern.matcher(multipartFormData);
            while (matcher.find()) {
                return matcher.group(1);
            }
        } catch (Exception e) {
            return "";
        }
        return "";
    }

}

class BufferingClientHttpResponseWrapper implements ClientHttpResponse {

    private final ClientHttpResponse response;

    @Nullable
    private byte[] body;


    BufferingClientHttpResponseWrapper(ClientHttpResponse response) {
        this.response = response;
    }

    @Override
    public HttpStatusCode getStatusCode() throws IOException {
        return this.response.getStatusCode();
    }

    @Override
    public int getRawStatusCode() throws IOException {
        return this.response.getStatusCode().value();
    }

    @Override
    public String getStatusText() throws IOException {
        return this.response.getStatusText();
    }

    @Override
    public HttpHeaders getHeaders() {
        return this.response.getHeaders();
    }

    @Override
    public InputStream getBody() throws IOException {
        if (this.body == null) {
            this.body = StreamUtils.copyToByteArray(this.response.getBody());
        }

        return new ByteArrayInputStream(this.body);
    }

    @Override
    public void close() {
        this.response.close();
    }

}
