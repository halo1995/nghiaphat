package com.brostech.transport.common.exception;

import com.brostech.transport.common.exception.pojo.IAlertCode;
import org.springframework.http.HttpStatus;

public class BusinessException extends AbstractException {

    public BusinessException(IAlertCode alertCode) {
        super(alertCode);
    }

    public BusinessException(String message, String code) {
        super(IAlertCode.createErrorAlert(code, message));
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }

}
