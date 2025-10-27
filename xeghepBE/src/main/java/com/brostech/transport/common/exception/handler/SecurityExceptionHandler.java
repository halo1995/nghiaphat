package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import com.brostech.transport.common.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import com.brostech.transport.common.models.SecurityException;

@ControllerAdvice
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class SecurityExceptionHandler extends AbstractExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityExceptionHandler.class);
    public static final String EXCEPTION_MESSAGE = "Dịch vụ tạm thời gián đoạn, bạn vui lòng thực hiện lại sau ít phút.";

    @ExceptionHandler(SecurityException.class)
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    @ResponseBody
    @Order(value = Ordered.HIGHEST_PRECEDENCE)
    public ResponseEntity<ExceptionDTO> handleSecurityException(SecurityException ex) {
        LOGGER.info("[EXCEPTION][HANDLER] SecurityException: {}", ex.getMessage());

        var message = StringUtils.isNullOrEmpty(ex.getMessage()) ? EXCEPTION_MESSAGE : ex.getMessage();
        var code = StringUtils.isNullOrEmpty(ex.getCode()) ? "" : ex.getCode();

        var responseException = ExceptionDTO.builder().code(code).message(message).build();
        return new ResponseEntity<>(responseException, HttpStatus.BAD_REQUEST);
    }
}
