package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.Constants;
import com.brostech.transport.common.exception.AbstractException;
import com.brostech.transport.common.exception.AuthenticationException;
import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import com.brostech.transport.common.factory.LoggingFactory;
import com.brostech.transport.common.util.StringUtils;
import com.brostech.transport.common.util.Utils;
import org.slf4j.Logger;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class AuthenticationExceptionHandler extends AbstractExceptionHandler {

    private static final Logger LOGGER = LoggingFactory.getLogger(AuthenticationExceptionHandler.class);

    @Override
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ExceptionDTO> handle(AbstractException ex) {
        if (ex != null) {
            LOGGER.info("[EXCEPTION][AuthenticationExceptionHandler] AuthenticationException: {}, Stack Trace: {}", ex.getMessage(), Utils.toJson(ex.getStackTrace()));
        }
        var mes = ex == null || StringUtils.isNullOrEmpty(ex.getMessage()) ? Constants.EXCEPTION_MES : ex.getMessage();
        var code = ex == null || StringUtils.isNullOrEmpty(ex.getCode()) ? "" : ex.getCode();
        ExceptionDTO exceptionDTO = new ExceptionDTO();
        exceptionDTO.setCode(code);
        exceptionDTO.setMessage(mes);
        return new ResponseEntity<>(exceptionDTO, (ex != null && ex.getStatus() != null) ? ex.getStatus(): HttpStatus.UNAUTHORIZED);
    }

}
