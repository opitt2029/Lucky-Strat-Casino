package com.luckystar.member.dto;

import jakarta.validation.constraints.NotNull;

public record FriendRequestDto(
        @NotNull Long receiverId
) {}
