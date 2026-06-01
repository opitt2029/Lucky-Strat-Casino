package com.luckystar.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;

/**
 * 速率限制金鑰解析器。
 *
 * <p>auth 端點（login / register）尚未通過身份驗證，故以「來源 IP」作為計數金鑰；
 * 配合 application.yml 中 `RequestRateLimiter` filter 套用於 `/api/v1/auth/**` 路由，
 * 在 Gateway 層就攔截暴力破解嘗試，避免請求穿透到 member-service。</p>
 *
 * <p>金鑰策略：優先取 `X-Forwarded-For` 第一段 IP（CDN / Load Balancer 轉發場景），
 * 否則退回 socket remote address；皆無時退回固定字串 `unknown` 讓限流仍生效。</p>
 */
@Configuration
public class RateLimitConfig {

    private static final String XFF_HEADER = "X-Forwarded-For";

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String xff = exchange.getRequest().getHeaders().getFirst(XFF_HEADER);
            if (xff != null && !xff.isBlank()) {
                int comma = xff.indexOf(',');
                return Mono.just((comma > 0 ? xff.substring(0, comma) : xff).trim());
            }
            InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
            if (remote != null && remote.getAddress() != null) {
                return Mono.just(remote.getAddress().getHostAddress());
            }
            return Mono.just("unknown");
        };
    }
}
