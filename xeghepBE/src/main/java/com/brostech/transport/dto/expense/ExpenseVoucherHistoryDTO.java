package com.brostech.transport.dto.expense;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ExpenseVoucherHistoryDTO {
    Long id;
    String fromStatus;
    String toStatus;
    String note;
    Long actionBy;
    String actionByName;
    String actionAt;
}
