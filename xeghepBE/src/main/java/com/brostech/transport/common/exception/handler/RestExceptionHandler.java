package com.brostech.transport.common.exception.handler;

import com.brostech.transport.common.exception.pojo.ExceptionDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(RestExceptionHandler.class);

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = err instanceof FieldError ? ((FieldError) err).getField() : err.getObjectName();
            String message = err.getDefaultMessage();
            fieldErrors.put(field, message);
        });
        ExceptionDTO body = ExceptionDTO.builder()
                .message("Validation failed")
                .description("Invalid request parameters")
                .code("VALIDATION_ERROR")
                .details(fieldErrors)
                .build();
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ResponseStatusException.class)
    @ResponseBody
    public ResponseEntity<ExceptionDTO> handleResponseStatus(ResponseStatusException ex) {
        LOGGER.warn("[EXCEPTION] {} - {}", ex.getStatusCode(), ex.getReason());
        ExceptionDTO body = ExceptionDTO.builder()
                .message(ex.getReason())
                .code(String.valueOf(ex.getStatusCode().value()))
                .build();
        return new ResponseEntity<>(body, ex.getStatusCode());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    @ResponseBody
    public ExceptionDTO handleDataIntegrity(DataIntegrityViolationException ex) {
        LOGGER.error("[EXCEPTION] DataIntegrityViolationException: {}", ex.getMessage());
        return ExceptionDTO.builder()
                .message("Data integrity violation")
                .description(ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage())
                .code("DATA_INTEGRITY_VIOLATION")
                .build();
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ResponseBody
    public ExceptionDTO handleGeneral(Exception ex) {
        LOGGER.error("[EXCEPTION] Unhandled exception", ex);
        return ExceptionDTO.builder()
                .message("Internal server error")
                .description(ex.getMessage())
                .code("INTERNAL_ERROR")
                .build();
    }
}
