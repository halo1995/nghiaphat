package com.brostech.transport.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;

@Service
@Slf4j
public class LocationMappingService {

    private final Map<String, ProvinceItem> provinceMap = new HashMap<>();

    @Data
    public static class ProvinceItem {
        private String code;
        private String name;
        private String nameEn;
        private Map<String, DistrictItem> districts = new HashMap<>();
    }

    @Data
    public static class DistrictItem {
        private String code;
        private String name;
        private String nameEn;
        private Map<String, WardItem> wards = new HashMap<>();
    }

    @Data
    public static class WardItem {
        private String code;
        private String name;
        private String nameEn;
    }

    @Data
    public static class ResolutionResult {
        private String provinceCode;
        private String districtCode;
        private String wardCode;
    }

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("data/vn-divisions.json");
            if (!resource.exists()) {
                log.warn("vn-divisions.json not found. Location mapping will not work.");
                return;
            }
            ObjectMapper mapper = new ObjectMapper();
            List<List<Object>> data;
            try (InputStream is = resource.getInputStream(); InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8)) {
                data = mapper.readValue(reader, new TypeReference<List<List<Object>>>() {});
            }

            for (Object pObj : data) {
                if (pObj instanceof List) {
                    List<?> pList = (List<?>) pObj;
                    ProvinceItem province = new ProvinceItem();
                    province.setCode((String) pList.get(0));
                    province.setName((String) pList.get(1));
                    province.setNameEn((String) pList.get(3));
                    
                    provinceMap.put(province.getCode(), province);

                    if (pList.size() > 4 && pList.get(4) instanceof List) {
                        List<?> dListWrap = (List<?>) pList.get(4);
                        for (Object dObj : dListWrap) {
                            if (dObj instanceof List) {
                                List<?> dList = (List<?>) dObj;
                                DistrictItem district = new DistrictItem();
                                district.setCode((String) dList.get(0));
                                district.setName((String) dList.get(1));
                                district.setNameEn((String) dList.get(3));
                                province.getDistricts().put(district.getCode(), district);

                                if (dList.size() > 4 && dList.get(4) instanceof List) {
                                    List<?> wListWrap = (List<?>) dList.get(4);
                                    for (Object wObj : wListWrap) {
                                        if (wObj instanceof List) {
                                            List<?> wList = (List<?>) wObj;
                                            WardItem ward = new WardItem();
                                            ward.setCode((String) wList.get(0));
                                            ward.setName((String) wList.get(1));
                                            ward.setNameEn((String) wList.get(3));
                                            district.getWards().put(ward.getCode(), ward);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            log.info("Initialized LocationMappingService with {} provinces", provinceMap.size());
        } catch (Exception e) {
            log.error("Failed to load location data", e);
        }
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return StringUtils.stripAccents(text.toLowerCase())
                .replace("tinh ", "")
                .replace("thanh pho ", "")
                .replace("tp ", "")
                .replace("quan ", "")
                .replace("huyen ", "")
                .replace("thi xa ", "")
                .replace("xa ", "")
                .replace("phuong ", "")
                .trim();
    }

    public ResolutionResult resolveLocation(String provinceName, String districtName, String wardName) {
        ResolutionResult result = new ResolutionResult();
        if (StringUtils.isBlank(provinceName)) return result;

        String normP = normalizeText(provinceName);
        ProvinceItem matchedProvince = null;

        for (ProvinceItem p : provinceMap.values()) {
            if (normalizeText(p.getName()).equals(normP) || normalizeText(p.getNameEn()).equals(normP)) {
                matchedProvince = p;
                break;
            }
        }

        if (matchedProvince == null) {
            // Find by containment
            for (ProvinceItem p : provinceMap.values()) {
                if (normP.contains(normalizeText(p.getName()))) {
                    matchedProvince = p;
                    break;
                }
            }
        }

        if (matchedProvince != null) {
            result.setProvinceCode(matchedProvince.getCode());
            
            if (StringUtils.isNotBlank(districtName)) {
                String normD = normalizeText(districtName);
                DistrictItem matchedDistrict = null;
                for (DistrictItem d : matchedProvince.getDistricts().values()) {
                    if (normalizeText(d.getName()).equals(normD) || normalizeText(d.getNameEn()).equals(normD)) {
                        matchedDistrict = d;
                        break;
                    }
                }

                if (matchedDistrict != null) {
                    result.setDistrictCode(matchedDistrict.getCode());

                    if (StringUtils.isNotBlank(wardName)) {
                        String normW = normalizeText(wardName);
                        WardItem matchedWard = null;
                        for (WardItem w : matchedDistrict.getWards().values()) {
                            if (normalizeText(w.getName()).equals(normW) || normalizeText(w.getNameEn()).equals(normW)) {
                                matchedWard = w;
                                break;
                            }
                        }
                        if (matchedWard != null) {
                            result.setWardCode(matchedWard.getCode());
                        } else {
                            // Fallback to district code if ward not exactly matched, frontend needs wardCode
                            result.setWardCode(matchedDistrict.getCode());
                        }
                    } else {
                        // Fallback to district code
                        result.setWardCode(matchedDistrict.getCode());
                    }
                } else {
                    // Fallback to province code if district not matched
                    result.setDistrictCode(matchedProvince.getCode());
                    result.setWardCode(matchedProvince.getCode());
                }
            } else {
                result.setDistrictCode(matchedProvince.getCode());
                result.setWardCode(matchedProvince.getCode());
            }
        }

        return result;
    }
}



