package com.brostech.transport.common.util;

import com.brostech.transport.common.factory.LoggingFactory;
import org.slf4j.Logger;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class StringUtils {

    private static final Logger LOGGER = LoggingFactory.getLogger(StringUtils.class);
    public static final List<String> SYMBOL_CONSTANT = List.of("<", ">", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", ".", "?", "-");
    public static final String EMPTY = "";
    public static final String STRING_AND_DIGIT_REGEX = "[^A-Za-z0-9]";
    public static final String STAR_REGEX = "\\b([1-5])\\b";
    private static final String PATTERN_EMOJI = "(?:[\\u2700-\\u27bf]|" +

            "(?:[\\ud83c\\udde6-\\ud83c\\uddff]){2}|" +
            "[\\ud800\\udc00-\\uDBFF\\uDFFF]|[\\u2600-\\u26FF])[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]|[\\ud83c\\udffb-\\ud83c\\udfff])?" +

            "(?:\\u200d(?:[^\\ud800-\\udfff]|" +

            "(?:[\\ud83c\\udde6-\\ud83c\\uddff]){2}|" +
            "[\\ud800\\udc00-\\uDBFF\\uDFFF]|[\\u2600-\\u26FF])[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]|[\\ud83c\\udffb-\\ud83c\\udfff])?)*|" +

            "[\\u0023-\\u0039]\\ufe0f?\\u20e3|\\u3299|\\u3297|\\u303d|\\u3030|\\u24c2|[\\ud83c\\udd70-\\ud83c\\udd71]|[\\ud83c\\udd7e-\\ud83c\\udd7f]|\\ud83c\\udd8e|[\\ud83c\\udd91-\\ud83c\\udd9a]|[\\ud83c\\udde6-\\ud83c\\uddff]|[\\ud83c\\ude01-\\ud83c\\ude02]|\\ud83c\\ude1a|\\ud83c\\ude2f|[\\ud83c\\ude32-\\ud83c\\ude3a]|[\\ud83c\\ude50-\\ud83c\\ude51]|\\u203c|\\u2049|[\\u25aa-\\u25ab]|\\u25b6|\\u25c0|[\\u25fb-\\u25fe]|\\u00a9|\\u00ae|\\u2122|\\u2139|\\ud83c\\udc04|[\\u2600-\\u26FF]|\\u2b05|\\u2b06|\\u2b07|\\u2b1b|\\u2b1c|\\u2b50|\\u2b55|\\u231a|\\u231b|\\u2328|\\u23cf|[\\u23e9-\\u23f3]|[\\u23f8-\\u23fa]|\\ud83c\\udccf|\\u2934|\\u2935|[\\u2190-\\u21ff]";

    private StringUtils() {

    }

    public static String get6DigitNumber() {
        var number = new SecureRandom().nextInt(999999);
        return String.format("%06d", number);
    }

    public static boolean isNullOrEmpty(String val) {
        return val == null || val.trim().isBlank() || val.trim().isEmpty();
    }

    public static boolean isNotNullOrEmpty(String val) {
        return !isNullOrEmpty(val);
    }

    public static boolean isOnlyNumber(String val) {
        if (isNullOrEmpty(val)) return false;

        return val.chars().allMatch(Character::isDigit);
    }

    public static boolean isLength(int max, int min, String value) {
        return value.length() == min || value.length() == max;
    }

    public static boolean isValidStar(final String star) {
        if (star == null || StringUtils.isNullOrEmpty(star.trim())) {
            return false;
        }
        return RegexUtils.isCheck(star, STAR_REGEX);
    }

    public static boolean containsIgnoreCase(String str, String searchStr) {
        return org.apache.commons.lang3.StringUtils.containsIgnoreCase(str, searchStr);
    }

    /**
     * Kiểm tra chỉ cho phép là 1 trong các kí tự đã được định nghĩa
     *
     * @param s : chuỗi đầu vào
     * @return true nếu string contain
     */
    public static boolean checkMatchingSymbol(String s) {
        List<String> specialCharacterList = getSpecialCharacter(s);

        int i = 0;
        if (!specialCharacterList.isEmpty())
            i = (int) specialCharacterList.stream().filter(x -> !SYMBOL_CONSTANT.contains(x)).count();

        return i <= 0;
    }

    /**
     * Counts the number of special characters in s.
     */
    private static List<String> getSpecialCharacter(String s) {
        List<String> specialCharacterList = new ArrayList<>();
        for (int i = 0; i < s.length(); i++) {
            String si = s.substring(i, i + 1);
            if (si.matches(STRING_AND_DIGIT_REGEX)) {
                specialCharacterList.add(si);
            }
        }
        return specialCharacterList;
    }

    /**
     * Kiểm tra xem có phải emoji không
     * Nếu đếm có nhiều hơn 1 emoji thì trả về true
     */
    public static boolean checkMatchingEmoji(String password) {

        final Pattern pattern = Pattern.compile(PATTERN_EMOJI);
        final Matcher matcher = pattern.matcher(password);

        int foundEmojiCount = 0;
        while (matcher.find()) {
            LOGGER.info("[STRING_UTILS][CHECK_MATCHING_EMOJI][{}]", matcher.group(0).toCharArray());
            foundEmojiCount++;
        }
        return foundEmojiCount > 0;
    }

    public static boolean equalsIgnoreCase(CharSequence cs1, CharSequence cs2) {
        return org.apache.commons.lang3.StringUtils.equalsIgnoreCase(cs1, cs2);
    }
}

