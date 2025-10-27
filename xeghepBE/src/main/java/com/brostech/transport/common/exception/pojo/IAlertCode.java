package com.brostech.transport.common.exception.pojo;

public interface IAlertCode {
    public String getCode();

    String getMessage();

    public AlertType getType();

    static IAlertCode createErrorAlert(String code, String message) {
        return new IAlertCode() {
            @Override
            public String getCode() {
                return code;
            }

            @Override
            public String getMessage() {
                return message;
            }

            @Override
            public AlertType getType() {
                return AlertType.ERROR;
            }
        };
    }
}
