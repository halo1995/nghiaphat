package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.Constants;
import com.brostech.transport.common.models.FieldItem;
import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import com.brostech.transport.common.factory.LoggingFactory;
import com.brostech.transport.common.util.StringUtils;
import org.slf4j.Logger;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@ControllerAdvice
@Order
public class AllExceptionHandler {

    private static final Logger LOGGER = LoggingFactory.getLogger(AllExceptionHandler.class);

    private static final String DESCRIPTION = "Lỗi này xảy ra khi không thể bắt chính xác những ngoại lệ của hệ thống. Trong code có chỗ nào đấy bị lỗi và chưa kiểm soát được.";

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ExceptionDTO> handleAllException(Throwable ex) {
        LOGGER.info("[EXCEPTION][AllExceptionHandler] AllException: {}, Stack Trace: {}", ex.getMessage(), ex.getStackTrace());
        return new ResponseEntity<>(ExceptionDTO.builder()
                .message(Constants.EXCEPTION_MES)
                .description(DESCRIPTION)
                .details(ex.getMessage())
                .build(),
                HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ExceptionDTO> handleExceptionMethodNotAllow(HttpRequestMethodNotSupportedException ex) {
        LOGGER.info("[EXCEPTION][AllExceptionHandler] HttpRequestMethodNotSupportedException: {}", ex.getMessage());
        return new ResponseEntity<>(ExceptionDTO.builder()
                .message(Constants.EXCEPTION_MES)
                .details(ex.getMessage())
                .build(),
                HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    @ResponseBody
    public ResponseEntity<ExceptionDTO> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
        StringBuilder message = new StringBuilder();
        var details = new ArrayList<>();

        Set<String> messageSet = new HashSet<>();
        var errors = ex.getBindingResult().getAllErrors();
        if (!errors.isEmpty()) {
            for (ObjectError item : errors) {
                if (messageSet.add(item.getDefaultMessage())) {
                    message.append(addConventionDetail(item.getDefaultMessage()));
                }
                var field = (FieldError) item;
                details.add(FieldItem.builder().name(field.getField()).message(addConventionDetail(item.getDefaultMessage())).build());
            }
        }

        var obj = ExceptionDTO.builder().message(message.toString()).details(details).build();
        return new ResponseEntity<>(obj, HttpStatus.BAD_REQUEST);
    }

    private String addConventionDetail(String value) {
        if (value == null || StringUtils.isNullOrEmpty(value)) {
            return value;
        }
        return value.trim().endsWith(".") ? value.trim() : value.trim() + ". ";
    }

}
