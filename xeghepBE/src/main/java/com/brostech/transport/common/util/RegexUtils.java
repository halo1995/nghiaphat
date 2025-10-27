package com.brostech.transport.common.util;

import java.util.regex.Pattern;

public class RegexUtils {

    private RegexUtils() {
    }

    public static final String FULL_NAME_REGEX = "^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềềểếỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\\s\\\\W|_]+[^@!#$%^&*():\';/?.,<>{}|0123456789]$";
    public static final String PASS_REGEX = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[\\u005C$#^><%&!/`\\[*|\\-{=}+\\]+:?\"()_;.,~@'])+[\\u005C$#^><%&/!`*\\[|\\-{=}+\\]:;?\"()_.,~@'a-zA-Z0-9]{6,32}$";
    private static final String BASE64_REGEX = "^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$";
    public static final String INTRODUCED_CODE_REGEX = "^[a-zA-Z0-9]{1,12}$";
    public static final String EMAIL_REGEX = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$";

    public static boolean isValidFullName(final String fullName) {
        if (StringUtils.isNullOrEmpty(fullName)) {
            return false;
        }
        return RegexUtils.isCheck(fullName, RegexUtils.FULL_NAME_REGEX);
    }

    public static boolean isValidPassword(final String password) {
        if (StringUtils.isNullOrEmpty(password)) {
            return false;
        }
        return RegexUtils.isCheck(password, RegexUtils.PASS_REGEX);
    }

    public static final String ONLY_CHARACTER_NUMBER_STRING = "^[a-zA-Z0-9]+$";

    public static final String ONLY_NUMBER_STRING = "[0-9]+";

    public static boolean onlyNumber(String value) {
        var pattern = Pattern.compile(ONLY_NUMBER_STRING);
        var matcher = pattern.matcher(value);
        return matcher.matches();
    }

    public static final String USER_NAME_REGEX = "^(((84)|0)[35789])([0-9]{8})$";

    public static boolean onlyUsername(String value) {
        var pattern = Pattern.compile(USER_NAME_REGEX);
        var matcher = pattern.matcher(value);
        return matcher.matches();
    }

    public static boolean isCheck(String value, String regex) {
        var pattern = Pattern.compile(regex);
        var matcher = pattern.matcher(value);
        return matcher.matches();
    }

    public static boolean isBase64String(String value) {
        if (StringUtils.isNullOrEmpty(value)) {
            return false;
        }
        return isCheck(value, BASE64_REGEX);
    }

    // Định nghĩa regex cho số điện thoại
    public static final String PHONE_NUMBER_REGEX = "\\b(84|0[3|5|7|8|9])+([0-9]{8})\\b";

    public static boolean isValidPhoneNumber(final String phoneNumber) {
        if (null == phoneNumber || phoneNumber.trim().length() == 0) {
            return false;
        }
        return RegexUtils.isCheck(phoneNumber, RegexUtils.PHONE_NUMBER_REGEX);
    }
}

