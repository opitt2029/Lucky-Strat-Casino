package com.luckystar.member.dto;

public record MemberRegisteredEvent(
        Long playerId,
        String username,
        String email
) {}
