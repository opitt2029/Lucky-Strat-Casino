package com.luckystar.wallet.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "member.registered", groupId = "wallet-service-group")
    public void handleMemberRegistered(String message, Acknowledgment ack) throws Exception {
        log.info("Received member.registered event: {}", message);

        // JsonProcessingException（格式錯誤）→ 不可重試，DefaultErrorHandler 直送 DLT
        MemberRegisteredEvent event = objectMapper.readValue(message, MemberRegisteredEvent.class);

        // 暫時性失敗（如 DB 斷線）讓例外往外拋，不 ack；error handler 重試後仍失敗才送 DLT
        walletService.createWallet(event.playerId());

        // 僅在成功時 ack，避免事件遺失
        ack.acknowledge();
    }
}
