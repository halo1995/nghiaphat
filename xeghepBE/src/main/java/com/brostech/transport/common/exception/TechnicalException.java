package com.brostech.transport.common.exception;

import com.brostech.transport.common.exception.pojo.IAlertCode;
import org.springframework.http.HttpStatus;

public class TechnicalException extends AbstractException {

    public TechnicalException(IAlertCode alertCode) {
        super(alertCode);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }

}

