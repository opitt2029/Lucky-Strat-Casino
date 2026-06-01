package com.luckystar.member.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;
import java.util.regex.Pattern;

public class AvatarUrlValidator implements ConstraintValidator<ValidAvatarUrl, String> {

    private static final Pattern HTTP_URL_PATTERN =
            Pattern.compile("^https?://[\\w\\-.]+(:\\d+)?(/[\\w\\-./?%&=]*)?$");

    // 白名單：僅允許靜態點陣圖 MIME；明確排除 svg+xml（可內嵌 <script> 造成 XSS）
    private static final Set<String> ALLOWED_DATA_PREFIXES = Set.of(
            "data:image/jpeg;base64,",
            "data:image/png;base64,",
            "data:image/gif;base64,",
            "data:image/webp;base64,"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        if (value.startsWith("data:")) {
            for (String prefix : ALLOWED_DATA_PREFIXES) {
                if (value.startsWith(prefix)) {
                    return true;
                }
            }
            return false;
        }
        return HTTP_URL_PATTERN.matcher(value).matches();
    }
}
