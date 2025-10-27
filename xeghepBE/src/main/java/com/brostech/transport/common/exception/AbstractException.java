package com.brostech.transport.common.exception;

import com.brostech.transport.common.exception.pojo.IAlertCode;
import org.springframework.http.HttpStatus;

public abstract class AbstractException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private IAlertCode alertCode;

    public AbstractException(IAlertCode alertCode) {
        this.alertCode = alertCode;
    }

    public IAlertCode getAlertCode() {
        return this.alertCode;
    }

    public String getMessage() {
        return this.alertCode.getMessage();
    }

    public String getCode() {
        return this.alertCode.getCode();
    }

    public String getType() {
        return this.alertCode.getType().name();
    }

    public abstract HttpStatus getStatus();

}
