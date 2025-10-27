package com.brostech.transport.common.factory;

import com.brostech.transport.middleware.LoggingFilter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.util.CollectionUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MaskingUtils {

    public static final String JAVA_LANG = "java.lang";
    public static final String FULL_MASKING = "*******";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Masking MASKING = LoggingConfig.load("logging-config.yaml");

    private MaskingUtils() {
        throw new IllegalArgumentException("MaskingUtils");
    }

    public static Object maskingSensitiveData(Object o, boolean isMasking) {
        if (!MASKING.getIsActive()) {
            return o;
        }
        if (o == null) {
            return o;
        }
        try {
            if (o instanceof URI) o = o.toString();
            Class<?> clazz = o.getClass();
            /*
            Nếu object không phải là dữ liệu dạng wrapper class như Integer, String, Float ...
            thì sẽ kiểm tra thông tin để trả về dữ liệu, dữ liệu mã hóa do isMasking
            */
            if (!clazz.getName().contains(JAVA_LANG)) {
                if (o instanceof Collection<?>) {
                    return maskingListData(o, isMasking);
                }
                return maskingMapData(o);
            } else {
                /*
                * Nếu trường hợp dữ liệu của map và list là 1 json map hoặc json object
                thì sẽ truy cập sâu vào các dữ liệu bên trong để mã hóa dữ liệu
                * */
                Object data = extractDataFromJsonString(o, isMasking);
                if (data != null) return data;
                // Nếu dữ liệu quá lớn thì sẽ chỉ lấy 1 vài kí tự đại diện tránh in log quá nhiều
                if (isLargeData(o.toString())) {
                    return getLargeValue(o.toString());
                }
                if (isMasking) {
                    return FULL_MASKING;
                }
                return o.toString();
            }
        } catch (Exception e) {
            // nothing
        }
        return o;
    }

    public static Object extractDataFromJsonString(Object o, boolean isEncryptString) {
        if (!(o instanceof String)) {
            return null;
        }
        String value = (String) o;
        if (value.contains("{") || value.contains("[")) {
            JsonNode jsonNode;
            try {
                jsonNode = OBJECT_MAPPER.readTree(value);
            } catch (Exception e) {
                return null;
            }
            if (jsonNode.isArray()) {
                return maskingListData(o, isEncryptString);
            } else if (jsonNode.isObject()) {
                return maskingMapData(o);
            }
        } else if (isURL(value)) {
            return maskingStringUrl(value);
        }
        return null;
    }

    public static Map<String, Object> maskingMapData(Object o) {
        Map<String, Object> map = getDataFromValue(o, new TypeReference<HashMap<String, Object>>() {
        });

        if (map == null) {
            return Collections.emptyMap();
        }

        for (Map.Entry<String, Object> value : map.entrySet()) {
            if (value.getValue() == null) {
                continue;
            }
            if (!value.getValue().getClass().getName().contains(JAVA_LANG)) {
                var maskingData = maskingSensitiveData(value.getValue(), isEncryptKey(value.getKey()));
                map.put(value.getKey(), maskingData);
                continue;
            }

            // Nếu trường hợp dữ liệu của map và list là 1 json map hoặc json object thì sẽ truy cập sâu vào các dữ liệu bên trong để mã hóa dữ liệu
            Object data = extractDataFromJsonString(value.getValue(), isEncryptKey(value.getKey()));
            if (data != null) {
                map.put(value.getKey(), data);
                continue;
            }

            if (isLargeData(value.getValue())) {
                map.put(value.getKey(), getLargeValue(value.getValue()));
            } else if (isEncryptKey(value.getKey())) {
                map.put(value.getKey(), FULL_MASKING);
            } else if (isMaskingKey(value.getKey())) {
                String maskStr = maskingValue(value.getValue());
                map.put(value.getKey(), maskStr);
            }
        }
        return map;
    }

    public static <T> T getDataFromValue(Object o, TypeReference<T> clazz) {
        if (o instanceof String) {
            try {
                return OBJECT_MAPPER.readValue((String) o, clazz);
            } catch (JsonProcessingException e) {
                return null;
            }
        } else {
            return OBJECT_MAPPER.convertValue(o, clazz);
        }
    }

    public static boolean isMaskingKey(String key) {
        if (isExcludeKey(key)) {
            return false;
        }
        for (String keyNeedMaking : MASKING.getIncludeKeys()) {
            if (StringUtils.containsIgnoreCase(key, keyNeedMaking)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isEncryptKey(String key) {
        if (isExcludeKey(key)) {
            return false;
        }
        for (String keyNeedEncrypt : MASKING.getEncryptKeys()) {
            if (StringUtils.containsIgnoreCase(key, keyNeedEncrypt)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isExcludeKey(String key) {
        for (String excludeKey : MASKING.getIgnoreKeys()) {
            if (StringUtils.containsIgnoreCase(key, excludeKey)) {
                return true;
            }
        }
        return false;
    }

    public static List<Object> maskingListData(Object o, boolean isMaskingString) {
        List<Object> list = getDataFromValue(o, new TypeReference<>() {
        });
        List<Object> listResult = new ArrayList<>();
        if (CollectionUtils.isEmpty(list)) {
            return listResult;
        }
        /*
         * Kiểm tra xem danh sách có nhiều hơn max length không, nếu nhiều hơn chỉ lấy từ phần tử thứ 0 đến LIST_MAX_LENGTH
         * Mục đích để tránh trả về dữ liệu quá dài
         */
        if (list.size() > MASKING.getDispayListMaxLength()) {
            list = list.subList(0, MASKING.getDispayListMaxLength());
            list.add("...");
        }
        for (Object object : list) {
            var maskingValue = maskingSensitiveData(object, isMaskingString);
            listResult.add(maskingValue);
        }
        return listResult;
    }

    public static String maskingValue(Object o) {
        String input = o.toString();
        int length = input.length() / 3;
        if (length < 1) return "*".repeat(input.length());
        return "*".repeat(length) + input.substring(length, input.length() - length) + "*".repeat(length);
    }

    public static Object[] maskingSensitiveData(Object... objects) {
        if (!MASKING.getIsActive()) {
            return objects;
        }
        List<Object> objectList = new ArrayList<>();
        try {
            for (Object o : objects) {
                objectList.add(maskingSensitiveData(o, false));
            }
        } catch (Exception e) {
            // nothing
        }
        return objectList.toArray();
    }

    public static Object maskingSensitiveData(Object o) {
        return maskingSensitiveData(o, false);
    }

    public static Map<String, Object> setParamToMap(Object... objects) {
        Map<String, Object> objectMap = new HashMap<>();
        // Đảm bảo thứ tự nếu cùng 1 class trong logging
        Map<String, Integer> keyOrder = new HashMap<>();
        try {
            for (Object o : objects) {
                if (o != null && !o.getClass().getName().startsWith(JAVA_LANG)) {
                    String key = o.getClass().getSimpleName();
                    // nếu không có trong map thứ tự thì sẽ convert về 0
                    int order = keyOrder.get(key) == null ? 0 : keyOrder.get(key);
                    int nexOrder = order + 1;
                    keyOrder.put(key, nexOrder);
                    objectMap.put(key + nexOrder, o);
                }
            }
        } catch (Exception e) {
            // nothing
        }
        return objectMap;
    }

    public static boolean isURL(String urlStr) {
        try {
            new URL(urlStr);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static String maskingStringUrl(String url) {
        url = url.trim();
        if (url.startsWith("http") && url.contains("?")) {
            var query = url.substring(url.indexOf("?") + 1);
            var path = "";
            var queries = query.split("&");
            for (var q : queries) {
                var k = q.substring(0, q.indexOf("="));
                var v = q.substring(q.indexOf("=") + 1);
                if (isEncryptKey(k)) {
                    v = FULL_MASKING;
                } else if (isMaskingKey(k)) {
                    v = maskingValue(v);
                }
                path = path + k + "=" + v + "&";
            }
            if (path.endsWith("&")) path = path.substring(0, path.length() - 1);
            return url.substring(0, url.indexOf("?") + 1) + path;
        }
        return url;
    }

    // Nếu trường hợp value quá lớn thì sẽ chỉ hiển thị thông báo text lớn
    private static boolean isLargeData(Object value) {
        if (value == null) {
            return false;
        }
        try {
            if (value instanceof String) {
                String str = String.valueOf(value);
                return str.length() > MASKING.getMaxSize();
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private static String getLargeValue(Object data) {
        String value = (String) data;
        String start = value.substring(0, 10);
        String end = value.substring(value.length() - 10);
        return start + "..." + end;
    }

}

@Slf4j
class LoggingConfig {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final String REGEX_ACTIVE_PATTERN = "\\$\\{([A-Za-z0-9_]+):([A-Za-z0-9_]+)}";

    public static Masking load(String configFile) {
        InputStream inputStream = LoggingFilter.class.getClassLoader().getResourceAsStream(configFile);
        Yaml yaml = new Yaml();
        Object object = yaml.load(inputStream);
        LoggingConfigProperty loggingConfigProperty = OBJECT_MAPPER.convertValue(object, LoggingConfigProperty.class);

        String activeConfig = loggingConfigProperty.getIsActive();
        boolean status = isActive(activeConfig);

        Masking masking = new Masking();
        masking.setIsActive(status);
        masking.setDispayListMaxLength(loggingConfigProperty.getDispayListMaxLength());
        masking.setMaxSize(loggingConfigProperty.getMaxSize());
        masking.setIncludeKeys(loggingConfigProperty.getMasking().getInclude());
        masking.setEncryptKeys(loggingConfigProperty.getMasking().getEncrypts());
        masking.setIgnoreKeys(loggingConfigProperty.getMasking().getIgnores());

        return masking;
    }

    private static boolean isActive(String activeConfig) {
        boolean status = true;
        try {
            Pattern pattern = Pattern.compile(REGEX_ACTIVE_PATTERN);
            Matcher matcher = pattern.matcher(activeConfig);
            if (matcher.matches()) {
                String variableName = matcher.group(1);
                String value = System.getenv(variableName);
                if (StringUtils.isNotBlank(value)) {
                    status = Boolean.parseBoolean(value);
                } else {
                    String defaultValue = matcher.group(2);
                    status = Boolean.parseBoolean(defaultValue);
                }
            } else {
                status = Boolean.parseBoolean(activeConfig);
            }

        } catch (Exception e) {
            log.error("[INIT] Lỗi khi truy xuất thông tin: {}", e.getMessage());
        }
        return status;
    }


}

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
class LoggingConfigProperty {

    @JsonProperty("is-active")
    private String isActive;

    @JsonProperty("dispay-list-max-length")
    private Integer dispayListMaxLength;

    @JsonProperty("max-size")
    private Integer maxSize;

    @JsonProperty("masking-key")
    private MaskingData masking;

}

@Data
class Masking {

    @JsonProperty("isActive")
    private Boolean isActive;

    @JsonProperty("dispayListMaxLength")
    private Integer dispayListMaxLength;

    @JsonProperty("maxSize")
    private Integer maxSize;

    @JsonProperty("includeKeys")
    private List<String> includeKeys;

    @JsonProperty("encryptKeys")
    private List<String> encryptKeys;

    @JsonProperty("ignoreKeys")
    private List<String> ignoreKeys;

}

@Data
class MaskingData {

    @JsonProperty("include")
    private List<String> include;

    @JsonProperty("encrypt")
    private List<String> encrypts;

    @JsonProperty("ignore")
    private List<String> ignores;

}
