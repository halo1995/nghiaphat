package com.brostech.transport.service;

import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.List;

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
public class ReverseGeocodeResponse {

    /**
     * Danh sách các kết quả địa điểm tương ứng với tọa độ
     */
    private List<Result> results;

    /**
     * Trạng thái phản hồi của API
     * Ví dụ: OK, INVALID_REQUEST
     */
    private String status;

    @Data
    @JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
    public static class Result {
        /**
         * Danh sách các thành phần tạo nên địa chỉ
         * Ví dụ: số nhà, tên đường, phường/xã, tỉnh
         */
        private List<AddressComponent> addressComponents;

        /**
         * Địa chỉ đầy đủ đã được format
         * Ví dụ: "Siêu thị Thế Giới Di Động, Đường 25 tháng 5, Thanh Hà, Hải Phòng"
         */
        private String formattedAddress;

        /**
         * Thông tin hình học của địa điểm
         */
        private Geometry geometry;

        /**
         * ID đơn vị hành chính theo cấu trúc cũ
         */
        private DeprecatedCompoundId deprecatedCompoundId;
    }

    @Data
    @JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
    public static class AddressComponent {

        /**
         * Tên đầy đủ của thành phần địa chỉ
         */
        private String longName;

        /**
         * Tên viết tắt hoặc rút gọn
         */
        private String shortName;
    }

    @Data
    @JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
    public static class Geometry {

        /**
         * Tọa độ vị trí địa điểm
         */
        private Location location;
    }

    @Data
    @JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
    public static class Location {

        /**
         * Vĩ độ (latitude)
         */
        private Double lat;

        /**
         * Kinh độ (longitude)
         */
        private Double lng;
    }

    @Data
    @JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
    public static class DeprecatedCompoundId {

        /**
         * ID quận/huyện theo hệ thống cũ
         */
        private Integer district;

        /**
         * ID xã/phường theo hệ thống cũ
         */
        private Integer commune;

        /**
         * ID tỉnh/thành phố theo hệ thống cũ
         */
        private Integer province;
    }
}
