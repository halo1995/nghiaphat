package com.brostech.transport.service;

import com.brostech.transport.common.util.Utils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoongGeocodeService {

    private String apiKey = "VYIkITi91IjEq0dpwPxK0eJoIGpetR1boYfiSnrk";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public LocationMappingService.ResolutionResult getGeocodeResult(String address, LocationMappingService mappingService) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("Goong API Key is not configured");
        }

//        String url = UriComponentsBuilder.fromHttpUrl("https://rsapi.goong.io/v2/geocode")
//                .queryParam("address", address)
//                .queryParam("api_key", apiKey)
//                .queryParam("has_deprecated_administrative_unit", "true")
//                .queryParam("has_vnid", "true")
//                .build()
//                .toUriString();

        String url = "https://rsapi.goong.io/v2/geocode" + "?api_key=" + apiKey +
                "&has_deprecated_administrative_unit=true&has_vnid=true&limit=5&address=" + address;

        try {
            Object response = this.getV2(url, initHeader(), Object.class);
            log.info("[geocodeAddress][RESPONSE]{}", response);
            String json = Utils.toJson(response);
            log.info("[geocodeAddress][RESPONSE][JSON]{}", json);
            ReverseGeocodeResponse geocodeResponse = objectMapper.readValue(json, ReverseGeocodeResponse.class);

            if (geocodeResponse != null && "OK".equals(geocodeResponse.getStatus())
                    && geocodeResponse.getResults() != null && !geocodeResponse.getResults().isEmpty()) {
                
                // Lấy kết quả đầu tiên
                ReverseGeocodeResponse.Result firstResult = geocodeResponse.getResults().get(0);
                
                // Ưu tiên sử dụng deprecated_compound_id nếu có
                if (firstResult.getDeprecatedCompoundId() != null) {
                    LocationMappingService.ResolutionResult result = new LocationMappingService.ResolutionResult();
                    result.setProvinceCode(String.valueOf(firstResult.getDeprecatedCompoundId().getProvince()));
                    result.setDistrictCode(String.valueOf(firstResult.getDeprecatedCompoundId().getDistrict()));
                    result.setWardCode(String.valueOf(firstResult.getDeprecatedCompoundId().getCommune()));
                    return result;
                }

                // Nếu không có deprecated_compound_id, fallback về parsing address_components
                String province = "";
                String district = "";
                String ward = "";

                if (firstResult.getAddressComponents() != null) {
                    // Logic bóc tách dựa trên cấu trúc quen thuộc của Goong
                    // Thường thì thành phần cuối là Quốc gia, sau đó tới Tỉnh/Thành
                    int size = firstResult.getAddressComponents().size();
                    if (size >= 2) province = firstResult.getAddressComponents().get(size - 2).getLongName();
                    if (size >= 3) district = firstResult.getAddressComponents().get(size - 3).getLongName();
                    if (size >= 4) ward = firstResult.getAddressComponents().get(size - 4).getLongName();
                }

                return mappingService.resolveLocation(province, district, ward);
            }
        } catch (Exception e) {
            log.error("[geocodeAddress] Error mapping address: {}. Exception: {}", address, e.getMessage());
        }
        return new LocationMappingService.ResolutionResult();
    }

    public <T> T getV2(String url, HttpHeaders headers, Class<T> clazz) {
        HttpEntity<String> entity = new HttpEntity<>(headers);
        return restTemplate.exchange(url, HttpMethod.GET, entity, clazz).getBody();
    }

    protected HttpHeaders initHeader() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }
}

