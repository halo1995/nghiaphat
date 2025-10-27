package com.brostech.transport.common.util;

import com.brostech.transport.common.factory.LoggingFactory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Utils {
    private static final Logger LOGGER = LoggingFactory.getLogger(Utils.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private Utils() {
    }

    static {
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public static String toJson(Object object) {
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        try {
            return mapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            LOGGER.error("[UTILS][CONVERT_OBJECT_TO_JSON][EXCEPTION][{}]", e.getMessage());
            return "";
        }
    }

    public static <T> T convertJsonToObject(String data, Class<T> clazz) {
        if (StringUtils.isBlank(data)) {
            return null;
        }
        try {
            mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            return mapper.readValue(data, clazz);
        } catch (Exception e) {
            LOGGER.error("[UTILS][CONVERT_JSON_TO_OBJECT][EXCEPTION][{}]", e.getMessage());
            return null;
        }
    }

    public static <T> T convertJsonToObject(String data, TypeReference<T> valueTypeRef) {
        if (StringUtils.isBlank(data)) {
            return null;
        }
        try {
            return mapper.readValue(data, valueTypeRef);
        } catch (Exception e) {
            LOGGER.error("[UTILS][CONVERT_JSON_TO_OBJECT] Exception: {}", e.getMessage());
            return null;
        }
    }

    public static <T> T convertObjectToModel(Object data, Class<T> clazz) {
        if (ObjectUtils.isEmpty(data)) {
            return null;
        }
        try {
            String respData = mapper.writeValueAsString(data);
            return mapper.readValue(respData, clazz);
        } catch (Exception e) {
            LOGGER.error("[UTILS][CONVERT_OBJECT_TO_MODEL][EXCEPTION][{}]", e.getMessage());
            return null;
        }
    }

    public static <T> List<T> convertJsonToListObject(Object object, Class<T> clazz) {
        try {
            String data = mapper.writeValueAsString(object);
            return convertJsonToListObject(data, clazz);
        } catch (Exception e) {
            LOGGER.error("[UTILS][CONVERT_JSON_TO_LIST_OBJECT][EXCEPTION][{}]", e.getMessage());
            return Collections.emptyList();
        }
    }

    public static <T> List<T> convertJsonToListObject(String data, Class<T> clazz) {
        try {
            var tree = mapper.readTree(data);
            var list = new ArrayList<T>();
            for (var jsonNode : tree) {
                list.add(mapper.treeToValue(jsonNode, clazz));
            }
            return list;
        } catch (Exception e) {
            LOGGER.error("[UTILS][CONVERT_JSON_TO_LIST_OBJECT][EXCEPTION][{}]", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Convert 1 String Json sang dang Array List
     */
    public static <T> List<T> convertJsonToArrayList(String json, Class<T> tClass) {
        try {
            var typeFactory = mapper.getTypeFactory();
            var type = typeFactory.constructCollectionType(ArrayList.class, tClass);
            return mapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            LOGGER.error("[UTILS][CONVERT JSON TO ARRAYLIST] Exception: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public static void deleteFiles(List<File> lstFile) throws IOException {
        for (var lsFile : lstFile) {
            if (lsFile != null) {
                Files.deleteIfExists(lsFile.toPath());
                LOGGER.info("[UTILS][DELETE_FILE_SUCCESS]");
            }
        }
    }

    public static final List<String> IMAGE_DOC_CONTENT_TYPES = Arrays.asList(
            "image/gif",
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.ms-excel.addin.macroEnabled.12",
            "application/vnd.ms-excel.addin.macroenabled.12",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
            "application/vnd.ms-excel.sheet.macroenabled.12",
            "application/vnd.ms-excel.template.macroEnabled.12",
            "application/vnd.ms-excel.template.macroenabled.12",
            "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
            "application/vnd.ms-excel.sheet.binary.macroenabled.12",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
            "application/msword",
            "application/vnd.ms-word.document.macroEnabled.12",
            "application/vnd.ms-word.document.macroenabled.12",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
            "application/vnd.ms-word.template.macroEnabled.12",
            "application/vnd.ms-word.template.macroenabled.12"
    );
}
