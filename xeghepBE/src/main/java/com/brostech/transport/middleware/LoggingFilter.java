package com.brostech.transport.middleware;

import com.brostech.transport.common.factory.LoggingFactory;
import com.brostech.transport.common.factory.MaskingUtils;
import com.brostech.transport.common.util.JWTUtils;
import com.brostech.transport.common.util.Utils;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import lombok.*;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LoggingFilter là 1 filter sử dụng với mục đích in ra thông tin request và response
 * Class này liên quan đến RequestResponseCopyFilter, thứ tự chạy bắt buộc phải sau RequestResponseCopyFilter
 */
@Component
@Order(100)
public class LoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggingFactory.getLogger(LoggingFilter.class);

    private static final String X_FORWARDED_HOST = "x-forwarded-host";

    private static final String HOST = "host";

    private static final String X_ORIGINAL_FORWARDED_FOR = "x-original-forwarded-for";

    private static final String ORIGINAL_HOST = "original-host";

    private static final String CONTENT_TYPE = "content-type";

    private static final String RESPONSE = "RESPONSE";

    private static final List<String> REGEX_IGNORES = Arrays.asList("^/swagger.*", "^/actuator.*");

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain) throws ServletException, IOException {

        long start = System.nanoTime();

        HttpRequestWrapper httpRequestWrapper;
        HttpResponseWrapper httpResponseWrapper;

        // Nếu trường hợp không có RequestResponseCopyFilter để wrapping dữ liệu thì sẽ tạo ra 1 class wrapper mặc định
        if (isHttpRequestWrapper(request) && isHttpResponseWrapper(response)) {
            httpRequestWrapper = (HttpRequestWrapper) request;
            httpResponseWrapper = (HttpResponseWrapper) response;
        } else {
            log.info("[MONITOR][INIT] HttpRequestWrapper và HttpResponseWrapper chưa được khởi tạo");
            httpRequestWrapper = new HttpRequestWrapper(request);
            httpResponseWrapper = new HttpResponseWrapper(response);
        }

        filterChain.doFilter(httpRequestWrapper, httpResponseWrapper);

        String path = httpRequestWrapper.getRequestURI();
        // Sẽ không in log nếu là 1 số API cần ignore
        if (isPrintLogging(path)) {
            // Logging toàn bộ request và response theo quy định đã ban hành
            logRequestAndResponse(httpRequestWrapper, httpResponseWrapper, start);
        }
    }

    private boolean isPrintLogging(String path) {
        if (StringUtils.isBlank(path)) {
            return true;
        }
        return !isPathIgnore(path);
    }

    private boolean isPathIgnore(String path) {
        for (String regex : REGEX_IGNORES) {
            Pattern pattern = Pattern.compile(regex);
            Matcher matcher = pattern.matcher(path);
            if (matcher.matches()) {
                return true;
            }
        }
        return false;
    }

    private boolean isHttpRequestWrapper(HttpServletRequest request) {
        try {
            if (request instanceof HttpRequestWrapper) {
                return true;
            }
        } catch (Exception e) {
            // do nothing
        }
        return false;
    }

    private boolean isHttpResponseWrapper(HttpServletResponse response) {
        try {
            if (response instanceof HttpResponseWrapper) {
                return true;
            }
        } catch (Exception e) {
            // do nothing
        }
        return false;
    }

    private void logRequestAndResponse(HttpRequestWrapper httpRequestWrapper, HttpResponseWrapper httpResponseWrapper, long start) {

        var contextMap = MDC.getCopyOfContextMap();

        try {
            MCLogging mcLogging = new MCLogging();
            mcLogging.setMcXClientIp(getRequestHeader(httpRequestWrapper, "x-real-ip"));
            mcLogging.setMcXForwardedHost(getRequestHeader(httpRequestWrapper, X_FORWARDED_HOST));

            // Lấy thông tin payload request
            var requestPayload = getPayloadRequest(httpRequestWrapper);
            mcLogging.setMcRequestPayload(requestPayload);
            mcLogging.setMcRequestPayloadSize(String.valueOf(getObjectSize(requestPayload)));

            mcLogging.setMcPath(httpRequestWrapper.getRequestURI());
            mcLogging.setMcQueryParams(httpRequestWrapper.getQueryString());
            mcLogging.setMcMethod(httpRequestWrapper.getMethod());
            mcLogging.setMcHost(getRequestHeader(httpRequestWrapper, HOST));
            mcLogging.setMcXForwardedPrefix(httpRequestWrapper.getRequestURI());
            mcLogging.setMcContentType(getRequestHeader(httpRequestWrapper, CONTENT_TYPE));
            mcLogging.setMcUserAgent(getRequestHeader(httpRequestWrapper, "user-agent"));
            mcLogging.setMcType(RESPONSE);
            mcLogging.setMcRequestHeader(Utils.toJson(getHeaders(httpRequestWrapper)));
            mcLogging.setMcSrcSystem(getRequestHeader(httpRequestWrapper, "mc-src-system"));

            // Set giá trị logging từ request phục vụ hiển thị ở response
            Object responseObject = getPayloadResponse(httpResponseWrapper);
            long elapsed = System.nanoTime() - start; // Tính theo nano second
            mcLogging.setMcDuration(String.format("%.3f", elapsed / 1000000.0));

            var status = httpResponseWrapper.getStatus();
            mcLogging.setMcHttpStatusCode(String.valueOf(status));

            String payloadResponse = getPayloadResponse(responseObject);
            mcLogging.setMcPayloadResponse(payloadResponse);
            mcLogging.setMcPayloadResponseSize(String.valueOf(getObjectSize(payloadResponse)));

            var responseHeaders = getHeaders(httpResponseWrapper);
            mcLogging.setMcResponseHeader(Utils.toJson(responseHeaders));

            String mcAppCode = getMcAppCode(mcLogging);
            mcLogging.setMcAppCode(mcAppCode);

            String username = getUsername(mcLogging);
            mcLogging.setMcUsername(username);

            String mcOriginalPath = getMcOriginPath();
            mcLogging.setMcOriginalPath(mcOriginalPath);

            mcLogging.setMcOriginalHost(getRequestHeader(httpRequestWrapper, ORIGINAL_HOST));
            mcLogging.setMcXOriginalForwardedFor(getRequestHeader(httpRequestWrapper, X_ORIGINAL_FORWARDED_FOR));

            Map<String, String> mcLoggingMap = OBJECT_MAPPER.convertValue(MaskingUtils.maskingSensitiveData(mcLogging), Map.class);

            if (contextMap != null) {

                Map<String, String> contextMapClone = new HashMap<>(contextMap);
                contextMapClone.putAll(mcLoggingMap);
                MDC.setContextMap(contextMapClone);

                String path = mcLogging.getMcPath();
                String statusCode = mcLogging.getMcHttpStatusCode();
                String duration = mcLogging.getMcDuration();
                log.info("[MONITOR][RESPONSE] Thông tin response: username={} - URL={} - STATUS={} - DURATION={}", username, path, statusCode, duration);
            } else {
                log.info("[MONITOR][RESPONSE] Thông tin response {} - Header {}", mcLogging, getHeaders(httpRequestWrapper));
            }

        } catch (Exception ex) {
            log.info("[MONITOR][EXCEPTION] logging request exception: {}", ex.getMessage());
        } finally {
            MDC.setContextMap(contextMap);
        }
    }

    private String getMcOriginPath() {
        try {
            RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
            if (requestAttributes == null) {
                return "";
            }
            Object mcOriginalPathObject = requestAttributes.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
            String mcOriginalPath = (String) mcOriginalPathObject;
            if (StringUtils.equals(mcOriginalPath, "/**")) {
                return "";
            }
            return mcOriginalPath;
        } catch (Exception e) {
            return "";
        }
    }

    private String getMcAppCode(MCLogging mcLogging) {
        try {

            String statusCode = mcLogging.getMcHttpStatusCode();

            // Tìm kiếm mã lỗi dải 4xx và 5xx để in ra app code
            boolean is4xx = String.valueOf(statusCode).startsWith("4");
            boolean is5xx = String.valueOf(statusCode).startsWith("5");

            if (!(is4xx || is5xx)) {
                return null;
            }

            String payloadResponse = mcLogging.getMcPayloadResponse();

            if (StringUtils.isNotBlank(payloadResponse) && !StringUtils.equalsIgnoreCase(payloadResponse, "BYTE_ARRAY")) {
                Map<String, String> responseBody = OBJECT_MAPPER.readValue(payloadResponse, new TypeReference<HashMap<String, String>>() {
                });
                return responseBody.get("code");
            }
        } catch (Exception e) {
            log.info("[MONITOR][EXCEPTION] Có lỗi khi lấy app_code: {}", e.getMessage());
        }
        return null;
    }

    private static Object getPayloadResponse(HttpResponseWrapper httpResponseWrapper) {
        Object responseObject = null;
        byte[] responseCopy = new byte[0];
        try {
            responseCopy = httpResponseWrapper.getCopy();
            if (responseCopy != null && responseCopy.length > 0) {
                responseObject = OBJECT_MAPPER.readValue(responseCopy, Object.class);
            }
        } catch (IOException e) {
            return new String(responseCopy);
        }
        return responseObject;
    }

    /**
     * Lấy thông tin username
     * Username được ưu tiên lấy từ JWTUtils sau đó sẽ nằm trong body request và query param
     */
    private String getUsername(MCLogging mcLogging) {

        String username = JWTUtils.getUsername();
        if (!StringUtils.isBlank(username)) {
            return username;
        }

        String contentType = mcLogging.getMcContentType();
        if (contentType != null && contentType.contains("application/json")) {
            String requestPayload = mcLogging.getMcRequestPayload();
            try {
                Map<String, String> requestBody = OBJECT_MAPPER.readValue(requestPayload, new TypeReference<HashMap<String, String>>() {
                });
                username = requestBody.get("username");

            } catch (Exception e) {
                // do nothing
            }
        }

        // Lấy thông tin Username trong Query param
        if (StringUtils.isBlank(username)) {
            username = getUsernameFromQueryParam(mcLogging);
        }

        // Nếu không có username hoặc thông tin username không phải là SDT thì sẽ không sử dụng
        if (StringUtils.isBlank(username)) {
            username = "<EMPTY>";
        }

        return username;
    }

    private static String getUsernameFromQueryParam(MCLogging mcLogging) {
        String queryParamsStr = mcLogging.getMcQueryParams();
        if (!StringUtils.isBlank(queryParamsStr)) {
            Map<String, String> queryParams = convertQueryParamsToMap(queryParamsStr);
            return queryParams.get("username");
        }
        return "";
    }

    public static Map<String, String> convertQueryParamsToMap(String queryParams) {
        try {
            Map<String, String> map = new HashMap<>();
            String[] keyValuePairs = queryParams.split("&");

            for (String pair : keyValuePairs) {
                String[] parts = pair.split("=");
                if (parts.length == 2) {
                    String key = parts[0];
                    String value = parts[1];
                    map.put(key, value);
                }
            }

            return map;
        } catch (Exception e) {
            return new HashMap<>();
        }

    }

    private String getPayloadResponse(Object body) throws JsonProcessingException {
        String payloadResponse;
        if (body == null) {
            return "";
        }
        if (isByteArray(body)) {
            payloadResponse = "BYTE_ARRAY";
        } else {
            payloadResponse = OBJECT_MAPPER.writeValueAsString(body);
        }
        return payloadResponse;
    }

    private boolean isByteArray(Object object) {
        try {
            if (object instanceof byte[]) {
                return true;
            }
        } catch (Exception e) {
            // Do nothing
        }
        return false;

    }

    private String getPayloadRequest(HttpRequestWrapper httpRequestWrapper) {
        String requestBody;
        try {
            String contentType = getRequestHeader(httpRequestWrapper, CONTENT_TYPE);
            Map<String, String> bodyMap = new HashMap<>();
            if (contentType != null && contentType.contains("multipart/form-data")) {
                Collection<Part> parts = httpRequestWrapper.getParts();
                for (Part part : parts) {
                    String name = part.getName();
                    if (part.getContentType() != null) {
                        // Nếu trong multipart data mà là file thì sẽ không in ra, chỉ in <FILE>
                        bodyMap.put(name, String.format("<FILE type=%s name=%s>", part.getContentType(), part.getSubmittedFileName()));
                    } else {
                        String value = getPartValue(part);
                        bodyMap.put(name, value);
                    }
                }
                requestBody = OBJECT_MAPPER.writeValueAsString(bodyMap);
            } else if (contentType != null && contentType.contains("application/json")) {
                requestBody = IOUtils.toString(httpRequestWrapper.getReader());
            } else {
                requestBody = String.format("<BODY type=%s>", contentType);
            }
            return requestBody;
        } catch (Exception e) {
            log.info("[MONITOR][EXCEPTION] getBody = {}", e.getMessage());
            return "";
        }
    }

    private String getPartValue(Part part) throws IOException {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int length;
        try (InputStream inputStream = part.getInputStream()) {
            while ((length = inputStream.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, length);
            }
        }
        return byteArrayOutputStream.toString();
    }

    private String getFullURL(HttpServletRequest request) {
        StringBuilder requestURL = new StringBuilder(request.getRequestURL().toString());
        String queryString = request.getQueryString();

        if (queryString == null) return requestURL.toString();

        return requestURL.append('?').append(queryString).toString();

    }

    private HashMap<String, String> getHeaders(HttpServletRequest httpServletRequest) {
        var headers = new HashMap<String, String>();
        var hNames = httpServletRequest.getHeaderNames();
        while (hNames.hasMoreElements()) {
            String hName = hNames.nextElement();
            if (hName.equalsIgnoreCase("Authorization")) headers.put(hName, "NOT RECORDED");
            else headers.put(hName, getRequestHeader(httpServletRequest, hName));
        }
        return headers;
    }

    private HashMap<String, String> getHeaders(HttpServletResponse httpServletResponse) {
        var headers = new HashMap<String, String>();
        var headersCollecion = httpServletResponse.getHeaderNames();
        headersCollecion.stream().forEach(hName -> headers.put(hName, httpServletResponse.getHeader(hName)));
        return headers;
    }

    private String getRequestHeader(HttpServletRequest httpServletRequest, String name) {
        try {
            var value = httpServletRequest.getHeader(name);
            return StringUtils.isBlank(value) ? "" : value;
        } catch (Exception e) {
            return StringUtils.EMPTY;
        }
    }

    private static void serialize(final Serializable obj, final OutputStream outputStream) {
        try (ObjectOutputStream out = new ObjectOutputStream(outputStream)) {
            out.writeObject(obj);
        } catch (final IOException ex) {
            throw new RuntimeException();
        }
    }

    private static byte[] serialize(final Serializable obj) {
        final ByteArrayOutputStream baos = new ByteArrayOutputStream(512);
        serialize(obj, baos);
        return baos.toByteArray();
    }

    private static int getObjectSize(Serializable object) {
        return serialize(object).length;
    }

}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
class MCLogging {

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Thời gian nhận được request</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("time")
    private String mcTime;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Payload của request, bỏ qua các request vào dạng ảnh, nén hoặc binary html. </li>
     *      <li>Các dữ liệu nhạy cảm sẽ được mã hóa một chiều theo thuật toán do Security cung cấp</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("request_payload")
    private String mcRequestPayload;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Giúp xác định độ lớn của request từ đó ngoaại suy được các trường hợp bất thường</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("request_payload_size")
    private String mcRequestPayloadSize;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Payload của response, chứa thông tin trả ra của ứng dụng, caần được log lại để thực hiện truy vết khi cần.</li>
     *      <li>Các dữ liệu nhạy cảm sẽ được mã hóa một chiều theo thuật toán do Security cung cấp</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("payload_response")
    private String mcPayloadResponse;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Giúp xác định độ lớn của response từ đó ngoaại suy được các trường hợp bất thường</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("payload_response_size")
    private String mcPayloadResponseSize;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Taàn bộ header của request, dữ liệu nhạy cảm (token, authorization) sẽ được mã hóa một chiều theo thuật toán do Security cung cấp.</li>
     *      <li>Thông tin này sẽ hữu ích để truy vết khi có lỗi hoặc thống kê báo cáo nếu cần</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("request_header")
    private String mcRequestHeader;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Toàn bộ header của response, dữ liệu nhạy cảm (token, authorization) sẽ được mã hóa một chiều theo thuật toán do Security cung cấp.</li>
     *      <li>Thông tin này sẽ hữu ích để truy vết khi có lỗi hoặc thống kê báo cáo nếu cần</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("response_header")
    private String mcResponseHeader;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Chứa IP client thật của client để phục vụ tra cứu khi có sự cố (không phải IP của ALB hay APIGW).</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("x_client_ip")
    private String mcXClientIp;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Path của request, sử dụng khi cần kiểm tra lỗi hệ thống</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("path")
    private String mcPath;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Request param của GET request, sử dụng khi cần kiểm tra lỗi hệ thống</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("query_params")
    private String mcQueryParams;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Method của request, xác định phương thức truy cập</li>
     * </ul>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("method")
    private String mcMethod;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Hostname mà client gọi tới API này. Xác định nguồn truy cập vào từ domain nào của hệ thống</li>
     * </ul>
     * <p><b>Ví dụ</b>: full_url: https://a.b.c.d/ab c/xyz?a=1 | hostname: a.b.c.d</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("host")
    private String mcHost;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Thông tin host mà request đã đi qua đầu tiên</li>
     * </ul>
     * <p><b>Ví dụ</b>: dudu.mcredit.com.vn</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("x_forwarded_host")
    private String mcXForwardedHost;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Path được gọi vào trước khi xuống service backend (thường được sinh ra từ APIGW). Xác định poth api nào trên APIGW được truy cập.</li>
     * </ul>
     * <p><b>Ví dụ</b>: /vvv</p>
     * <p><b>Required</b>: Optional</p>
     */
    @JsonProperty("x_forwarded_prefix")
    private String mcXForwardedPrefix;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Content-type của dữ liệu đầu vào. Cho biết kiểu dữ liệu đầu vào là gì</li>
     * </ul>
     * <p><b>Ví dụ</b>: Application/json</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("content-type")
    private String mcContentType;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Thông tin định danh của hệ thống nguồn gọi vào. Ví dụ: từ hệ thống của đối tác A gọi vào microservice của MC thì mc-src-system sẽ là tên của đối tác A. Nếu microservice đang có nhiều hệ thống gọi vào thì mc-src- system phải thể hiện rõ của theo đúng hệ thống gọi vào.</li>
     *      <li>Các dự án mới thì yêu cầu bắt buộc phải có, các dự án cũ cần thông báo đối tác để thực hiện bổ sung và test dev/uat trước khi đẩy lên prod.</li>
     * </ul>
     * <p><b>Ví dụ</b>: ABC</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("mc-src-system")
    private String mcSrcSystem;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Thông tin user-agent, xác định user agent nào đang được gọi tới hệ thống, có thể detect được botnet</li>
     * </ul>
     * <p><b>Ví dụ</b>: Mozila</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("user_agent")
    private String mcUserAgent;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Cấp độ log, Sẽ được in ra mặc định bởi Logback mà không cần can thiệp bằng code</li>
     * </ul>
     * <p><b>Ví dụ</b>: info/warn/error/ debug/trace</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("log_level")
    private String mcLogLevel;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Tên microservice đang được log, xác định được đây là microservice gì, Sẽ được in ra mặc định bởi Logback mà không cần can thiệp bằng code</li>
     * </ul>
     * <p><b>Ví dụ</b>: loan-origination-service</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("application_name")
    private String applicationName;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Tổng thời gian thực hiện request => biết được có chậm hay không.</li>
     * </ul>
     * <p><b>Ví dụ</b>: 10000</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("duration")
    private String mcDuration;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Trạng thái của http status => biết request có thành công hay lỗi.</li>
     * </ul>
     * <p><b>Ví dụ</b>: 200|500|401|403</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("http_status_code")
    private String mcHttpStatusCode;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Mã code trả ra từ ứng dụng khi có lỗi, giúp vận hành xác định và xử lý lỗi nhanh và chính xác.</li>
     * </ul>
     * <p><b>Ví dụ</b>: AFS0H1V0001 (đã được định nghĩa trong slide số 5 )</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("app_code")
    private String mcAppCode;

    /**
     * Thông tin thêm, mô tả
     */
    @JsonProperty("api_description")
    private String apiDescription;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Gía trị mặc định là RESPONSE (viết hoa), đối với log in ra để trace sẽ là LOGIC.</li>
     * </ul>
     * <p><b>Ví dụ</b>: f7d8a1710002f03b44a0a8bf050f214d</p>
     * <p><b>Required</b>: Mandatory (khi sử dụng kafka).</p>
     */
    @JsonProperty("queue_traceid")
    private String mcQueueTraceid;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Gía trị mặc định là RESPONSE (viết hoa), đối với log in ra để trace sẽ là LOGIC.</li>
     * </ul>
     * <p><b>Ví dụ</b>: RESPONSE|LOGIC</p>
     * <p><b>Required</b>: Mandatory</p>
     */
    @JsonProperty("type")
    private String mcType;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Là username của người dùng đã gọi request đến server.Người dùng có thể gọi qua app, website hoặc qua 1 hệ thống trung gian (ví dụ như là BPM- NEW nhận yêu cầu của sale thông qua kênh m-sale)...</li>
     *      <li>Mục đích là để xác định được hành vi người dùng theo hành vi cụ thể.</li>
     *      <li>Thông tin username sẽ được lấy, bóc tách từ các thông tin trong request mà client gửi lên. Nó có thể là payload, header, token ...</li>
     *      <li>Chỉ yêu cầu bắt buộc đối với các những trường hợp có thể detect được username từ các thông tin trong request. Các trường hợp mà không thể detect được thì sẽ để giá trị là rỗng.</li>
     * </ul>
     * <p><b>Ngày thêm mới</b>: 13/10/2023</p>
     * <p><b>Ví dụ</b>: hanct.ho</p>
     * <p><b>Required</b>: Mandatory (khi sử dụng kafka).</p>
     */
    @JsonProperty("username")
    private String mcUsername;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Là path nguyên bản của API.</li>
     *      <li>Mục đích là để thống kê và luồng đi của api.</li>
     * </ul>
     * <p><b>Ngày thêm mới</b>: 13/10/2023</p>
     * <p><b>Ví dụ</b>: /ping/v9/{name}/{code}</p>
     * <p><b>Required</b>: Mandatory (khi sử dụng kafka).</p>
     */
    @JsonProperty("original_path")
    private String mcOriginalPath;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Hostname mà client gọi tới API này. Xác định client đang truy cập vào từ domain nào của hệ thống .</li>
     *      <li>Lấy trong header theo trường original-host (thông tin này sẽ được devop cấu hình trên hạ tầng và forward vào cho BE)</li>
     *      <li>Trong trường hợp mà hostname không bị override khi tới BE thì giá trị của original_path tương đương với host</li>
     * </ul>
     * <p><b>Ngày thêm mới</b>: 13/10/2023</p>
     * <p><b>Ví dụ</b>: Ví dụ như khi app gọi vào BE với host là m4s.mcredit.com.vn. Khi đi qua api gateway thì bị override lại thành prod-ext-channel- ing.mcredit.com.vn. Lúc này devop sẽ forward cho BE thêm host m4s.mcredit.com.vn vào header theo trường original-host ==> giá trị của original_host lúc này sẽ là m4s.mcredit.com.vn</p>
     * <p><b>Required</b>: Mandatory (khi sử dụng kafka).</p>
     */
    @JsonProperty("original_host")
    private String mcOriginalHost;

    /**
     * <h2>Giải thích</h2>
     * <ul>
     *      <li>Thông tin các ip mà request đã đi qua.</li>
     *      <li>Lấy trong header theo trường x- original-forwarded-for</li>
     * </ul>
     * <p><b>Ngày thêm mới</b>: 13/10/2023</p>
     * <p><b>Ví dụ</b>: 172.20.148.131, 10.20.10.148</p>
     * <p><b>Required</b>: Mandatory (khi sử dụng kafka).</p>
     */
    @JsonProperty("x_original_forwarded_for")
    private String mcXOriginalForwardedFor;

}
