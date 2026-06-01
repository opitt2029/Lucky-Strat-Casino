package com.luckystar.member.dto;

import java.time.LocalDateTime;

public record FriendshipResponse(
        Long id,
        Long requesterId,
        Long receiverId,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
