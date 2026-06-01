package com.luckystar.wallet.kafka;

public record MemberRegisteredEvent(
        Long playerId,
        String username,
        String email
) {}
