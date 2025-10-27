package com.brostech.transport.aop;

import com.brostech.transport.common.util.StringUtils;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NotNullOrEmptyValidator implements ConstraintValidator<NotNullOrEmpty, String> {

    @Override
    public boolean isValid(String s, ConstraintValidatorContext constraintValidatorContext) {
        return !StringUtils.isNullOrEmpty(s);
    }

}
