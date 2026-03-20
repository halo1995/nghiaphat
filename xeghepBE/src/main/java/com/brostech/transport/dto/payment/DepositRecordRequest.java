package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.DepositRecord;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class DepositRecordRequest {
    @NotNull
    private Long driverId;
    
    private Long tripId;

    @NotNull(message = "Số tiền nộp không được để trống")
    @Positive(message = "Số tiền nộp phải lớn hơn 0")
    private Double amount;
    
    private DepositRecord.PaymentMethod paymentMethod;

    private String note;
    
    // Optional: For auto-allocation to trips on specific date
    private String paymentDate; // Format: yyyy-MM-dd
}
