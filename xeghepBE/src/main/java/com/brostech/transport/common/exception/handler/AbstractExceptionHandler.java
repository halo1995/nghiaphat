package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.Constants;
import com.brostech.transport.common.exception.AbstractException;
import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import com.brostech.transport.common.factory.LoggingFactory;
import com.brostech.transport.common.util.StringUtils;
import com.brostech.transport.common.util.Utils;
import org.slf4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public class AbstractExceptionHandler {

    private static final Logger LOGGER = LoggingFactory.getLogger(AbstractExceptionHandler.class);

    public ResponseEntity<ExceptionDTO> handle(AbstractException ex) {
        if (ex != null) {
            LOGGER.info("[EXCEPTION][AbstractExceptionHandler] AbstractException: {}, Stack Trace: {}", ex.getMessage(), Utils.toJson(ex.getStackTrace()));
        }
        var mes = ex == null || StringUtils.isNullOrEmpty(ex.getMessage()) ? Constants.EXCEPTION_MES : ex.getMessage();
        var code = ex == null || StringUtils.isNullOrEmpty(ex.getCode()) ? "" : ex.getCode();
        ExceptionDTO exceptionDTO = new ExceptionDTO();
        exceptionDTO.setCode(code);
        exceptionDTO.setMessage(mes);
        return new ResponseEntity<>(exceptionDTO, (ex != null && ex.getStatus() != null) ? ex.getStatus(): HttpStatus.BAD_REQUEST);
    }

}
