package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.exception.AbstractException;
import com.brostech.transport.common.exception.ValidationException;
import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class ValidationExceptionHandler extends AbstractExceptionHandler {

    @Override
    @ExceptionHandler(value = {ValidationException.class})
    public ResponseEntity<ExceptionDTO> handle(AbstractException ex) {
        return super.handle(ex);
    }

}
