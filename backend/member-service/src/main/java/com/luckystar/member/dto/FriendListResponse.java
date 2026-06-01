package com.luckystar.member.dto;

import java.time.LocalDateTime;

public record FriendListResponse(
        Long friendshipId,
        Long friendId,
        String friendUsername,
        String friendNickname,
        String friendAvatarUrl,
        LocalDateTime friendSince
) {}
