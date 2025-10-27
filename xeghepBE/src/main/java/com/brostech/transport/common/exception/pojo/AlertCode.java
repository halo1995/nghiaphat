package com.brostech.transport.common.exception.pojo;

public class AlertCode {
    private String code;
    private String message;
    private AlertType type;

    public AlertCode(final String code, final String label, final AlertType type) {
        this.code = code;
        this.message = label;
        this.type = type;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public AlertType getType() {
        return type;
    }
}
