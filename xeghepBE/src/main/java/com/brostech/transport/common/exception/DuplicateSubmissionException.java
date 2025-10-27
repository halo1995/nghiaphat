package com.brostech.transport.common.exception;

import com.brostech.transport.common.exception.pojo.IAlertCode;
import org.springframework.http.HttpStatus;

public class DuplicateSubmissionException extends AbstractException {

    public DuplicateSubmissionException(IAlertCode alertCode) {
        super(alertCode);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }

}

