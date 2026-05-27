package com.luckystar.member.security;

import com.luckystar.member.service.TokenRedisService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRedisService tokenRedisService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                   TokenRedisService tokenRedisService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenRedisService = tokenRedisService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Step 1: 讀取 Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // Step 2: 驗證 token 簽章與有效期
        if (!jwtTokenProvider.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        Claims claims = jwtTokenProvider.getClaimsFromToken(token);
        String jti = claims.get("jti", String.class);

        // Step 3: 檢查黑名單（已登出的 token）
        if (tokenRedisService.isBlacklisted(jti)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 4: 從 claims 取得身份資訊
        Long memberId = Long.valueOf(claims.getSubject());
        String username = claims.get("username", String.class);

        // Step 5: 設定 SecurityContext；details 存 memberId 供 logout 使用
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());
        auth.setDetails(memberId);
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Step 6: 繼續 filter chain
        filterChain.doFilter(request, response);
    }
}
