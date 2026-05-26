package com.luckystar.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Gateway JWT 驗證設定。Secret 必須與 member-service 簽發端一致。
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        /** 不需要 JWT 驗證的路徑前綴（登入、註冊、健康檢查等） */
        List<String> whitelist
) {
    public JwtProperties {
        if (whitelist == null || whitelist.isEmpty()) {
            whitelist = List.of(
                    "/api/v1/auth/",
                    "/actuator/health"
            );
        }
    }
}
