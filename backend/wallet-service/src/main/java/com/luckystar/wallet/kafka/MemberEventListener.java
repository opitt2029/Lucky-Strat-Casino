package com.luckystar.wallet.kafka;

import com.luckystar.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemberEventListener {

    private final WalletService walletService;

    @KafkaListener(topics = "member.registered", groupId = "wallet-service-group")
    public void handleMemberRegistered(String message, Acknowledgment ack) {
        log.info("Received member.registered event: {}", message);

        // 格式錯誤屬不可重試（poison）：拋出後由 DefaultErrorHandler 直送 member.registered.DLT
        long playerId = Long.parseLong(message.trim());

        // 暫時性失敗（如 DB 斷線）讓例外往外拋，不 ack；error handler 重試後仍失敗才送 DLT
        walletService.createWallet(playerId);

        // 僅在成功時 ack，避免事件遺失
        ack.acknowledge();
    }
}
