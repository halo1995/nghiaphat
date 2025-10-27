package com.brostech.transport.common.exception;

import com.brostech.transport.common.exception.pojo.IAlertCode;
import org.springframework.http.HttpStatus;

public class SecurityException extends AbstractException {

    public SecurityException(IAlertCode alertCode) {
        super(alertCode);
    }

    @Override
    public HttpStatus getStatus() {
        return null;
    }

}
