package com.luckystar.member.dto;

import java.time.LocalDate;

public record CheckinResponse(
        Long checkinId,
        LocalDate checkinDate,
        Integer consecutiveDays,
        Long rewardAmount
) {}
