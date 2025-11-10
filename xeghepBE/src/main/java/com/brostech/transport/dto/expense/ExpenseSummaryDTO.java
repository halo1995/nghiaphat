package com.brostech.transport.dto.expense;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ExpenseSummaryDTO {
    Double totalApproved;
    Double totalPending;
    Double totalRejected;
    Long pendingCount;
    Long approvedCount;
    Long rejectedCount;
    Double walletBalance;
}
