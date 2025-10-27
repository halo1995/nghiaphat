package com.brostech.transport.common.factory;

import com.brostech.transport.common.util.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class HttpsCommon {

    public static String getValueFromHeader(String key) {
        try {
            ServletRequestAttributes servletRequestAttributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (servletRequestAttributes != null) {
                HttpServletRequest request = servletRequestAttributes.getRequest();
                return request.getHeader(key);
            }
        } catch (Exception e) {
            return "";
        }
        return "";
    }

    public static Boolean getBooleanFromHeader(String key) {
        try {
            ServletRequestAttributes servletRequestAttributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (servletRequestAttributes != null) {
                HttpServletRequest request = servletRequestAttributes.getRequest();
                String strValue = request.getHeader(key);
                if (StringUtils.isNullOrEmpty(strValue)) {
                    return false;
                } else return "true".equalsIgnoreCase(strValue);
            }
        } catch (Exception e) {
            return false;
        }
        return false;
    }

}
