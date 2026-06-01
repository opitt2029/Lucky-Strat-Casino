package com.luckystar.member.controller;

import com.luckystar.member.dto.ApiResponse;
import com.luckystar.member.dto.CheckinResponse;
import com.luckystar.member.service.CheckinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class CheckinController {

    private final CheckinService checkinService;

    @PostMapping("/daily-checkin")
    public ResponseEntity<ApiResponse<CheckinResponse>> dailyCheckin() {
        Long playerId = Long.parseLong(
                SecurityContextHolder.getContext().getAuthentication().getName());
        CheckinResponse response = checkinService.checkin(playerId);
        return ResponseEntity.ok(ApiResponse.success(response, "Check-in successful"));
    }
}
